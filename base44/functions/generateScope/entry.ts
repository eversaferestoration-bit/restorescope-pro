import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Rules Engine ─────────────────────────────────────────────────────────────
// Each rule: { id, category, description, unit, trigger(ctx) → quantity|null }

const RULES = [
  // CONTAINMENT
  {
    id: 'CONT-001', category: 'containment',
    description: 'Polyethylene containment barrier — critical/major damage',
    unit: 'LF',
    trigger: ({ observations, room }) => {
      const hasCritical = observations.some((o) => ['Critical', 'High'].includes(o.severity));
      const hasMold = observations.some((o) => o.observation_type === 'Mold Growth');
      if (hasCritical || hasMold) return Math.round((room.size_sqft || 100) ** 0.5 * 4); // perimeter estimate
      return null;
    },
  },
  {
    id: 'CONT-002', category: 'containment',
    description: 'Negative air machine setup — mold or smoke present',
    unit: 'EA',
    trigger: ({ observations, job }) => {
      const hasMold = observations.some((o) => o.observation_type === 'Mold Growth');
      const hasFire = job.loss_type === 'fire';
      return (hasMold || hasFire) ? 1 : null;
    },
  },

  // DEMOLITION
  {
    id: 'DEMO-001', category: 'demolition',
    description: 'Remove & dispose saturated drywall',
    unit: 'SF',
    trigger: ({ moisture, room }) => {
      const wetDrywall = moisture.filter((m) => m.material === 'Drywall' && m.reading_value > 16);
      if (!wetDrywall.length) return null;
      return Math.round((room.size_sqft || 100) * 0.5); // rough wall SF estimate
    },
  },
  {
    id: 'DEMO-002', category: 'demolition',
    description: 'Remove & dispose saturated carpet & pad',
    unit: 'SY',
    trigger: ({ moisture, room }) => {
      const wetCarpet = moisture.filter((m) => m.material === 'Carpet' && m.reading_value > 0);
      if (!wetCarpet.length) return null;
      return Math.round((room.size_sqft || 100) / 9);
    },
  },
  {
    id: 'DEMO-003', category: 'demolition',
    description: 'Remove & dispose saturated wood subfloor',
    unit: 'SF',
    trigger: ({ moisture, room }) => {
      const wet = moisture.filter((m) => ['Wood Subfloor', 'Plywood', 'OSB'].includes(m.material) && m.reading_value > 19);
      if (!wet.length) return null;
      return room.size_sqft || 100;
    },
  },
  {
    id: 'DEMO-004', category: 'demolition',
    description: 'Remove & dispose mold-affected materials',
    unit: 'SF',
    trigger: ({ observations, room }) => {
      const hasMold = observations.some((o) => o.observation_type === 'Mold Growth');
      return hasMold ? Math.round((room.size_sqft || 100) * 0.3) : null;
    },
  },

  // DRYING
  {
    id: 'DRY-001', category: 'drying',
    description: 'Dehumidifier placement — structural drying',
    unit: 'EA/DAY',
    trigger: ({ moisture, env }) => {
      const hasHighMoisture = moisture.some((m) => m.reading_value > 16);
      const hasHighRH = env.some((e) => e.relative_humidity > 60);
      if (hasHighMoisture || hasHighRH) return 1;
      return null;
    },
  },
  {
    id: 'DRY-002', category: 'drying',
    description: 'Air mover — accelerated evaporation',
    unit: 'EA/DAY',
    trigger: ({ moisture, room }) => {
      const wetCount = moisture.filter((m) => m.reading_value > 16).length;
      if (!wetCount) return null;
      return Math.max(1, Math.round((room.size_sqft || 100) / 50));
    },
  },
  {
    id: 'DRY-003', category: 'drying',
    description: 'Drying monitoring & documentation (daily)',
    unit: 'DAY',
    trigger: ({ moisture }) => {
      return moisture.some((m) => m.reading_value > 16) ? 3 : null; // default 3 days
    },
  },

  // CLEANING
  {
    id: 'CLEAN-001', category: 'cleaning',
    description: 'Antimicrobial application — affected surfaces',
    unit: 'SF',
    trigger: ({ observations, moisture, room }) => {
      const hasMold = observations.some((o) => o.observation_type === 'Mold Growth');
      const hasWater = moisture.some((m) => m.reading_value > 16);
      if (hasMold || hasWater) return room.size_sqft || 100;
      return null;
    },
  },
  {
    id: 'CLEAN-002', category: 'cleaning',
    description: 'Detailed cleaning — fire/smoke residue',
    unit: 'SF',
    trigger: ({ job, room }) => {
      return job.loss_type === 'fire' ? (room.size_sqft || 100) : null;
    },
  },
  {
    id: 'CLEAN-003', category: 'cleaning',
    description: 'Wet wipe walls & ceilings',
    unit: 'SF',
    trigger: ({ observations, room }) => {
      const hasStain = observations.some((o) => o.observation_type === 'Staining');
      return hasStain ? Math.round((room.size_sqft || 100) * 0.8) : null;
    },
  },

  // DEODORIZATION
  {
    id: 'DEOD-001', category: 'deodorization',
    description: 'Thermal fog deodorization — odor present',
    unit: 'EA',
    trigger: ({ observations }) => {
      const hasOdor = observations.some((o) => o.observation_type === 'Odor');
      return hasOdor ? 1 : null;
    },
  },
  {
    id: 'DEOD-002', category: 'deodorization',
    description: 'Hydroxyl generator — persistent odor',
    unit: 'EA/DAY',
    trigger: ({ observations, job }) => {
      const hasSevereOdor = observations.some((o) => o.observation_type === 'Odor' && ['High', 'Critical'].includes(o.severity));
      return (hasSevereOdor || job.loss_type === 'fire') ? 3 : null;
    },
  },

  // HEPA
  {
    id: 'HEPA-001', category: 'hepa',
    description: 'HEPA vacuuming — mold spore remediation',
    unit: 'SF',
    trigger: ({ observations, room }) => {
      const hasMold = observations.some((o) => o.observation_type === 'Mold Growth');
      return hasMold ? (room.size_sqft || 100) : null;
    },
  },
  {
    id: 'HEPA-002', category: 'hepa',
    description: 'Air scrubber with HEPA filter',
    unit: 'EA/DAY',
    trigger: ({ observations, job }) => {
      const hasMold = observations.some((o) => o.observation_type === 'Mold Growth');
      return (hasMold || job.loss_type === 'fire') ? 1 : null;
    },
  },

  // CONTENTS
  {
    id: 'CONT-C-001', category: 'contents',
    description: 'Pack out & inventory — contents affected',
    unit: 'HR',
    trigger: ({ room }) => room.contains_contents ? 2 : null,
  },
  {
    id: 'CONT-C-002', category: 'contents',
    description: 'Contents cleaning & deodorization',
    unit: 'EA',
    trigger: ({ room, observations }) => {
      const hasSmoke = observations.some((o) => o.observation_type === 'Odor');
      return (room.contains_contents && hasSmoke) ? 1 : null;
    },
  },

  // DOCUMENTATION
  {
    id: 'DOC-001', category: 'documentation',
    description: 'Pre-demo photo documentation',
    unit: 'EA',
    trigger: () => 1,
  },
  {
    id: 'DOC-002', category: 'documentation',
    description: 'Moisture mapping documentation',
    unit: 'EA',
    trigger: ({ moisture }) => moisture.length > 0 ? 1 : null,
  },
  {
    id: 'DOC-003', category: 'documentation',
    description: 'Mold assessment documentation',
    unit: 'EA',
    trigger: ({ observations }) => observations.some((o) => o.observation_type === 'Mold Growth') ? 1 : null,
  },
];

// ── AI Enhancement ────────────────────────────────────────────────────────────
async function aiEnhanceScope(base44, job, room, observations, moisture, env, ruleItems) {
  const ctx = {
    job: { loss_type: job.loss_type, service_type: job.service_type, cause_of_loss: job.cause_of_loss },
    room: { name: room.name, room_type: room.room_type, size_sqft: room.size_sqft, floor_level: room.floor_level },
    observations: observations.map((o) => ({ type: o.observation_type, severity: o.severity, description: o.description })),
    moisture_readings: moisture.map((m) => ({ material: m.material, value: m.reading_value, unit: m.unit, location: m.location_description })),
    environmental: env.map((e) => ({ temp_f: e.temperature_f, rh: e.relative_humidity, gpp: e.gpp })),
    rules_engine_items: ruleItems.map((i) => ({ category: i.category, description: i.description })),
  };

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are a restoration scope assistant. Review the job context below and suggest any ADDITIONAL scope line items NOT already in the rules_engine_items list. Be conservative. Suggest only what is clearly warranted by the damage evidence.

Context: ${JSON.stringify(ctx)}

Return a JSON object with key "additional_items" containing an array of objects:
{ "category": string (one of: containment|demolition|drying|cleaning|deodorization|hepa|contents|documentation), "description": string (max 100 chars), "unit": string, "quantity": number, "confidence": number (0-1), "reasoning": string (max 80 chars) }

Return empty array if nothing meaningful to add. No markdown.`,
    response_json_schema: {
      type: 'object',
      properties: {
        additional_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              description: { type: 'string' },
              unit: { type: 'string' },
              quantity: { type: 'number' },
              confidence: { type: 'number' },
              reasoning: { type: 'string' },
            },
          },
        },
      },
    },
  });

  return result?.additional_items || [];
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Strict authentication
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  const body = await req.json();
  const { job_id, room_id, use_ai = false } = body;

  // Input validation
  if (!job_id || !room_id) {
    return Response.json({ error: 'job_id and room_id required' }, { status: 400 });
  }

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }
  const job = jobs[0];

  // Company isolation - verify access
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
      user_id: user.id, 
      company_id: job.company_id, 
      is_deleted: false 
    });
    if (!profiles.length) {
      return Response.json({ error: 'Forbidden', message: 'Access denied: not a member of this company.' }, { status: 403 });
    }
  }

  // Role validation - technicians cannot generate scope
  if (user.role === 'technician') {
    return Response.json({ error: 'Forbidden', message: 'Technicians cannot generate scope items.' }, { status: 403 });
  }

  const rooms = await base44.asServiceRole.entities.Room.filter({ id: room_id, job_id, is_deleted: false });
  if (!rooms.length) return Response.json({ error: 'Room not found' }, { status: 404 });
  const room = rooms[0];

  // Gather inputs
  const [observations, moisture, env] = await Promise.all([
    base44.asServiceRole.entities.Observation.filter({ job_id, room_id, is_deleted: false }),
    base44.asServiceRole.entities.MoistureReading.filter({ job_id, room_id, is_deleted: false }),
    base44.asServiceRole.entities.EnvironmentalReading.filter({ job_id, room_id, is_deleted: false }),
  ]);

  const ctx = { observations, moisture, env, room, job };

  // Run rules engine
  const ruleItems = [];
  for (const rule of RULES) {
    const qty = rule.trigger(ctx);
    if (qty != null && qty > 0) {
      ruleItems.push({
        category: rule.category,
        description: rule.description,
        unit: rule.unit,
        quantity: qty,
        source: 'rules_engine',
        confidence: 1.0,
        rule_id: rule.id,
        status: 'suggested',
      });
    }
  }

  // Optional AI pass
  let aiItems = [];
  if (use_ai) {
    try {
      const additional = await aiEnhanceScope(base44, job, room, observations, moisture, env, ruleItems);
      aiItems = additional.map((item) => ({
        category: item.category,
        description: item.description,
        unit: item.unit || 'EA',
        quantity: item.quantity || 1,
        source: 'ai_suggested',
        confidence: item.confidence || 0.7,
        rule_id: null,
        status: 'suggested',
        notes: item.reasoning || null,
      }));
    } catch {
      // AI failure is non-fatal — rules engine results still returned
    }
  }

  const allItems = [...ruleItems, ...aiItems];

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'ScopeItem',
    entity_id: room_id,
    action: 'generated',
    actor_email: user.email,
    actor_id: user.id,
    description: `Scope generated for room "${room.name}" — ${ruleItems.length} rules + ${aiItems.length} AI items`,
    metadata: { job_id, room_id, use_ai, total: allItems.length },
  });

  return Response.json({ items: allItems, room, stats: { rules: ruleItems.length, ai: aiItems.length } });
});