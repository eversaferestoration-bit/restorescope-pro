import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { estimate_version_id } = await req.json();
  if (!estimate_version_id) return Response.json({ error: 'estimate_version_id required' }, { status: 400 });

  // Load the estimate draft
  const drafts = await base44.asServiceRole.entities.EstimateDraft.filter({ id: estimate_version_id, is_deleted: false });
  if (!drafts.length) return Response.json({ error: 'Estimate not found' }, { status: 404 });
  const draft = drafts[0];

  // Company membership check
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: draft.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load supporting data in parallel
  const [job, scopeItems, photos, rooms, observations, moistureReadings] = await Promise.all([
    base44.asServiceRole.entities.Job.filter({ id: draft.job_id, is_deleted: false }).then(r => r[0] || null),
    base44.asServiceRole.entities.ScopeItem.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.Photo.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.Room.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.Observation.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.MoistureReading.filter({ job_id: draft.job_id, is_deleted: false }),
  ]);

  const lineItems = draft.line_items || [];
  const confirmedScope = scopeItems.filter(s => s.status === 'confirmed');
  const photosWithAnalysis = photos.filter(p => p.analysis_status === 'analyzed' || p.damage_tags?.length > 0);

  // Build context summary for LLM
  const context = {
    job: {
      loss_type: job?.loss_type,
      service_type: job?.service_type,
      complexity_level: job?.complexity_level,
      emergency_flag: job?.emergency_flag,
      after_hours_flag: job?.after_hours_flag,
      summary_notes: job?.summary_notes,
    },
    estimate: {
      total: draft.total,
      subtotal: draft.subtotal,
      modifier_total: draft.modifier_total,
      line_item_count: lineItems.length,
      status: draft.status,
      notes: draft.notes,
      line_items_summary: lineItems.map(i => ({
        category: i.category,
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
        unit_cost: i.unit_cost,
        line_total: i.line_total,
        source: i.source,
        room: i.room_name,
      })),
    },
    documentation: {
      total_photos: photos.length,
      analyzed_photos: photosWithAnalysis.length,
      rooms_count: rooms.length,
      confirmed_scope_items: confirmedScope.length,
      total_scope_items: scopeItems.length,
      observations_count: observations.length,
      moisture_readings_count: moistureReadings.length,
      has_summary_notes: !!job?.summary_notes,
    },
    observations: observations.slice(0, 20).map(o => ({ type: o.observation_type, severity: o.severity, description: o.description })),
    moisture_readings: moistureReadings.slice(0, 20).map(m => ({ material: m.material, value: m.reading_value, unit: m.unit, location: m.location_description })),
  };

  const prompt = `You are an expert insurance claims defense analyst for property damage restoration. 
Analyze the following restoration job estimate and supporting documentation to assess its defensibility against carrier pushback.

JOB & ESTIMATE CONTEXT:
${JSON.stringify(context, null, 2)}

Your task:
1. Assign a defense_score (0-100) — 100 = fully bulletproof, 0 = carrier will deny
2. Identify risk_flags — specific line items or areas that are weak or unsupported
3. Identify missing_documentation — what evidence is absent that would strengthen the claim
4. Provide recommended_actions — concrete, actionable steps to improve claim defensibility
5. Assess carrier_pushback_risk overall: "low", "medium", or "high"

Scoring guidance:
- Photos with damage analysis: +10 pts each area covered (max +30)
- Moisture readings present: +15 pts
- Observations documented: +10 pts
- All scope items confirmed (not just suggested): +10 pts
- Emergency/complexity modifiers properly documented: +10 pts
- Summary notes present: +5 pts
- Deduct 5 pts per line item with no scope backing
- Deduct 10 pts if estimate total seems disproportionate to documented damage
- Deduct 15 pts if key categories (drying, demolition) have no supporting readings/observations

Be specific and actionable. Focus on insurance carrier scrutiny patterns.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        defense_score: { type: 'number' },
        carrier_pushback_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
        risk_flags: { type: 'array', items: { type: 'string' } },
        missing_documentation: { type: 'array', items: { type: 'string' } },
        recommended_actions: { type: 'array', items: { type: 'string' } },
      },
      required: ['defense_score', 'carrier_pushback_risk', 'risk_flags', 'missing_documentation', 'recommended_actions'],
    },
  });

  // Clamp score to 0-100
  const defense_score = Math.max(0, Math.min(100, Math.round(result.defense_score || 0)));

  // Save the analysis record
  const record = await base44.asServiceRole.entities.ClaimDefense.create({
    company_id: draft.company_id,
    job_id: draft.job_id,
    estimate_version_id,
    defense_score,
    risk_flags: result.risk_flags || [],
    missing_documentation: result.missing_documentation || [],
    recommended_actions: result.recommended_actions || [],
    carrier_pushback_risk: result.carrier_pushback_risk || 'medium',
    created_at: new Date().toISOString(),
  });

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: draft.company_id,
    entity_type: 'ClaimDefense',
    entity_id: record.id,
    action: 'analyzed',
    actor_email: user.email,
    actor_id: user.id,
    description: `Claim defense analysis run for estimate v${draft.version_number} — score: ${defense_score}`,
    metadata: { estimate_version_id, defense_score, carrier_pushback_risk: result.carrier_pushback_risk },
  });

  return Response.json({ analysis: record });
});