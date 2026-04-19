import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { job_id } = await req.json();
  if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });

  // Fetch all job data in parallel
  const [jobs, rooms, observations, moisture, env, scopeItems, photos] = await Promise.all([
    base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false }),
    base44.asServiceRole.entities.Room.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.Observation.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.MoistureReading.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.EnvironmentalReading.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.ScopeItem.filter({ job_id, is_deleted: false, status: 'confirmed' }),
    base44.asServiceRole.entities.Photo.filter({ job_id, is_deleted: false }),
  ]);

  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  // Verify company membership
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get unique confirmed categories
  const categories = [...new Set(scopeItems.map((i) => i.category))];

  if (!categories.length) {
    return Response.json({ error: 'no_confirmed_scope', message: 'No confirmed scope items found. Confirm scope items before generating justification.' }, { status: 422 });
  }

  // Build evidence summary
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.name]));

  const evidenceSummary = {
    job: {
      loss_type: job.loss_type,
      service_type: job.service_type,
      cause_of_loss: job.cause_of_loss,
      emergency: job.emergency_flag,
      after_hours: job.after_hours_flag,
      complexity: job.complexity_level,
      date_of_loss: job.date_of_loss,
    },
    rooms: rooms.map((r) => ({
      name: r.name,
      type: r.room_type,
      size_sqft: r.size_sqft,
      floor_level: r.floor_level,
      affected_materials: r.affected_materials,
      contains_contents: r.contains_contents,
    })),
    observations: observations.map((o) => ({
      room: roomMap[o.room_id] || o.room_id,
      type: o.observation_type,
      severity: o.severity,
      description: o.description,
    })),
    moisture_readings: moisture.map((m) => ({
      room: roomMap[m.room_id] || m.room_id,
      material: m.material,
      value: m.reading_value,
      unit: m.unit,
      location: m.location_description,
    })),
    environmental_readings: env.map((e) => ({
      room: roomMap[e.room_id] || e.room_id,
      temp_f: e.temperature_f,
      rh: e.relative_humidity,
      gpp: e.gpp,
      dew_point: e.dew_point,
    })),
    confirmed_scope: scopeItems.map((s) => ({
      category: s.category,
      description: s.description,
      unit: s.unit,
      quantity: s.quantity,
      room: roomMap[s.room_id] || 'all rooms',
      source: s.source,
    })),
    photo_count: photos.length,
    analyzed_photos: photos.filter((p) => p.analysis_status === 'analysis_complete').length,
    damage_tags: [...new Set(photos.flatMap((p) => p.damage_tags || []))],
    material_tags: [...new Set(photos.flatMap((p) => p.material_tags || []))],
  };

  const prompt = `You are a professional restoration scope writer preparing carrier-facing justification notes.

JOB EVIDENCE:
${JSON.stringify(evidenceSummary, null, 2)}

TASK: Write a separate, evidence-based justification note for EACH of these confirmed scope categories: ${categories.join(', ')}.

RULES:
1. Every claim MUST be tied to specific evidence from the data above (readings, observations, photos, room data).
2. Reference actual values (e.g., "moisture reading of 28% WME on drywall", "RH at 74%", "Critical mold growth observed in Master Bedroom").
3. Do NOT invent or assume conditions not present in the evidence.
4. Write in professional, carrier-review language (3-5 sentences per category).
5. If a category has weak evidence, write a short honest note explaining only what is documented.

Return a JSON object with key "justifications" — an array of objects:
{ "category": string, "note": string, "evidence_refs": string[] (brief list of evidence items cited) }`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        justifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              note: { type: 'string' },
              evidence_refs: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  });

  const justifications = result?.justifications || [];

  // Audit
  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Job',
    entity_id: job_id,
    action: 'justification_generated',
    actor_email: user.email,
    actor_id: user.id,
    description: `Justification generated for ${categories.length} scope categories`,
    metadata: { job_id, categories },
  });

  return Response.json({ justifications, categories, evidence_summary: { observations: observations.length, moisture: moisture.length, env: env.length, photos: photos.length, scope_items: scopeItems.length } });
});