import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { estimate_version_id } = await req.json();
  if (!estimate_version_id) return Response.json({ error: 'estimate_version_id required' }, { status: 400 });

  // Load estimate draft
  const draft = await base44.asServiceRole.entities.EstimateDraft.get(estimate_version_id).catch(() => null);
  if (!draft || draft.is_deleted) return Response.json({ error: 'Estimate not found' }, { status: 404 });

  // Auth: company membership
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: draft.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load supporting data in parallel
  const [job, scopeItems, photos, moistureReadings, envReadings, observations] = await Promise.all([
    base44.asServiceRole.entities.Job.get(draft.job_id).catch(() => null),
    base44.asServiceRole.entities.ScopeItem.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.Photo.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.MoistureReading.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.EnvironmentalReading.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.Observation.filter({ job_id: draft.job_id, is_deleted: false }),
  ]);

  if (!job || job.is_deleted) return Response.json({ error: 'Job not found' }, { status: 404 });

  const confirmedScope = scopeItems.filter(s => s.status === 'confirmed');
  const rejectedScope = scopeItems.filter(s => s.status === 'rejected');
  const lineItems = draft.line_items || [];

  // Build evidence summary for LLM
  const evidenceSummary = {
    job: {
      loss_type: job.loss_type,
      service_type: job.service_type,
      cause_of_loss: job.cause_of_loss,
      emergency_flag: job.emergency_flag,
      after_hours_flag: job.after_hours_flag,
      complexity_level: job.complexity_level,
      access_difficulty: job.access_difficulty,
      summary_notes: job.summary_notes,
    },
    estimate: {
      label: draft.label,
      status: draft.status,
      total: draft.total,
      subtotal: draft.subtotal,
      modifier_total: draft.modifier_total,
      applied_modifiers: draft.applied_modifiers,
      line_items_count: lineItems.length,
      line_items: lineItems.map(li => ({
        category: li.category,
        description: li.description,
        unit: li.unit,
        quantity: li.quantity,
        unit_cost: li.unit_cost,
        line_total: li.line_total,
        source: li.source,
        room_name: li.room_name,
      })),
    },
    documentation: {
      photos_count: photos.length,
      analyzed_photos: photos.filter(p => p.analysis_status === 'analyzed').length,
      damage_tags: [...new Set(photos.flatMap(p => p.damage_tags || []))],
      material_tags: [...new Set(photos.flatMap(p => p.material_tags || []))],
      moisture_readings_count: moistureReadings.length,
      env_readings_count: envReadings.length,
      observations_count: observations.length,
    },
    scope: {
      confirmed_items_count: confirmedScope.length,
      rejected_items_count: rejectedScope.length,
      categories_covered: [...new Set(confirmedScope.map(s => s.category))],
      ai_suggested_count: confirmedScope.filter(s => s.source === 'ai_suggested').length,
      manual_count: confirmedScope.filter(s => s.source === 'manual').length,
      rules_engine_count: confirmedScope.filter(s => s.source === 'rules_engine').length,
    },
  };

  const prompt = `You are a claim defense expert for property damage restoration companies. Analyze the following restoration job estimate and its supporting evidence to produce a comprehensive claim defense assessment.

JOB AND ESTIMATE DATA:
${JSON.stringify(evidenceSummary, null, 2)}

Your task is to:
1. Score the overall defensibility of this claim (0-100, where 100 = perfectly documented and defensible)
2. Identify risk flags — specific line items or categories that are weak, unsupported, or likely to be challenged by insurance carriers
3. Identify missing documentation that would strengthen the claim
4. Provide concrete recommended actions to improve the claim's defensibility
5. Assess the overall carrier pushback risk

SCORING CRITERIA:
- Photo documentation coverage (20 pts): Are all damaged areas photographed? AI analysis completed?
- Moisture/environmental data (20 pts): Are readings present and supporting the scope?
- Scope alignment (20 pts): Do line items match the documented damage and readings?
- Modifier justification (15 pts): Are emergency/after-hours/complexity modifiers well-supported?
- Observation completeness (15 pts): Are observations detailed and specific?
- Line item specificity (10 pts): Are quantities and descriptions precise and credible?

Be specific and actionable. Reference actual data from the estimate when flagging risks.`;

  const analysisSchema = {
    type: 'object',
    properties: {
      defense_score: { type: 'number' },
      analysis_summary: { type: 'string' },
      risk_flags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string' },
            line_item_ids: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      missing_documentation: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            area: { type: 'string' },
            description: { type: 'string' },
            impact: { type: 'string' }
          }
        }
      },
      recommended_actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            priority: { type: 'string' },
            action: { type: 'string' },
            rationale: { type: 'string' }
          }
        }
      },
      carrier_pushback_risk: { type: 'string' }
    }
  };

  const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: analysisSchema,
    model: 'claude_sonnet_4_6',
  });

  // Clamp score
  const defense_score = Math.min(100, Math.max(0, Math.round(analysis.defense_score || 0)));

  // Persist result
  const defense = await base44.asServiceRole.entities.ClaimDefense.create({
    company_id: draft.company_id,
    job_id: draft.job_id,
    estimate_version_id,
    defense_score,
    risk_flags: analysis.risk_flags || [],
    missing_documentation: analysis.missing_documentation || [],
    recommended_actions: analysis.recommended_actions || [],
    carrier_pushback_risk: analysis.carrier_pushback_risk || 'medium',
    analysis_summary: analysis.analysis_summary || '',
    created_at: new Date().toISOString(),
    is_deleted: false,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: draft.company_id,
    entity_type: 'ClaimDefense',
    entity_id: defense.id,
    action: 'analyzed',
    actor_email: user.email,
    actor_id: user.id,
    description: `Claim defense analyzed for estimate ${draft.label} — score: ${defense_score}`,
    metadata: { job_id: draft.job_id, estimate_version_id, defense_score },
  });

  return Response.json({ defense });
});