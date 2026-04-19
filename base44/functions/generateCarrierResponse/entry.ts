import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { estimate_version_id, carrier_feedback_text } = await req.json();
  if (!estimate_version_id) return Response.json({ error: 'estimate_version_id required' }, { status: 400 });
  if (!carrier_feedback_text) return Response.json({ error: 'carrier_feedback_text required' }, { status: 400 });

  // Load estimate draft
  let drafts;
  try {
    drafts = await base44.asServiceRole.entities.EstimateDraft.filter({ id: estimate_version_id, is_deleted: false });
  } catch {
    return Response.json({ error: 'Estimate not found' }, { status: 404 });
  }
  if (!drafts.length) return Response.json({ error: 'Estimate not found' }, { status: 404 });
  const draft = drafts[0];

  // Auth: company membership
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: draft.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load supporting evidence
  const [jobs, scopeItems, photos, moistureReadings, envReadings, observations, claimDefense] = await Promise.all([
    base44.asServiceRole.entities.Job.filter({ id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.ScopeItem.filter({ job_id: draft.job_id, is_deleted: false, status: 'confirmed' }),
    base44.asServiceRole.entities.Photo.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.MoistureReading.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.EnvironmentalReading.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.Observation.filter({ job_id: draft.job_id, is_deleted: false }),
    base44.asServiceRole.entities.ClaimDefense.filter({ estimate_version_id, is_deleted: false }),
  ]);

  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  // Build evidence context for LLM
  const evidenceContext = {
    estimate: {
      label: draft.label,
      total: draft.total,
      subtotal: draft.subtotal,
      line_items_count: draft.line_items?.length || 0,
      line_items: (draft.line_items || []).map(li => ({
        category: li.category,
        description: li.description,
        unit: li.unit,
        quantity: li.quantity,
        unit_cost: li.unit_cost,
        line_total: li.line_total,
        room_name: li.room_name,
      })),
    },
    job: {
      loss_type: job.loss_type,
      cause_of_loss: job.cause_of_loss,
      service_type: job.service_type,
      emergency_flag: job.emergency_flag,
      after_hours_flag: job.after_hours_flag,
      complexity_level: job.complexity_level,
      access_difficulty: job.access_difficulty,
    },
    documentation: {
      photos_count: photos.length,
      analyzed_photos: photos.filter(p => p.analysis_status === 'analyzed').length,
      damage_tags: [...new Set(photos.flatMap(p => p.damage_tags || []))],
      moisture_readings_count: moistureReadings.length,
      env_readings_count: envReadings.length,
      observations_count: observations.length,
      confirmed_scope_items_count: scopeItems.length,
    },
    defense_analysis: claimDefense.length > 0 ? {
      defense_score: claimDefense[0].defense_score,
      risk_flags: claimDefense[0].risk_flags,
      missing_documentation: claimDefense[0].missing_documentation,
    } : null,
  };

  const prompt = `You are a professional insurance claim response specialist. Draft a formal, evidence-based response to the insurance carrier's feedback.

CARRIER FEEDBACK:
"${carrier_feedback_text}"

ESTIMATE AND JOB EVIDENCE:
${JSON.stringify(evidenceContext, null, 2)}

Your task is to create a professional, firm but respectful response that:
1. Addresses each concern raised by the carrier
2. Provides specific rebuttal points backed by actual evidence from the estimate and job documentation
3. References supporting documentation (photos, moisture readings, observations, scope items)
4. Cites justification for line items and modifiers
5. Suggests revised language if the carrier's concerns have partial merit

CRITICAL RULES:
- Use ONLY data provided in the estimate and job evidence above
- Do NOT make unsupported claims or exaggerate
- Maintain a professional, firm, and respectful tone throughout
- Be specific — reference actual quantities, categories, and documentation counts
- If evidence is weak in any area, acknowledge it professionally and explain why the scope is still necessary
- Structure the response for easy reading by insurance adjusters

Output a structured response with these sections:
- opening_statement: Professional opening acknowledging receipt of feedback
- rebuttal_points: Array of specific responses to carrier concerns, each with "point" and "supporting_evidence"
- documentation_references: List of available documentation that supports the estimate (photos, readings, observations)
- justification_citations: Specific references to industry standards or evidence that justify disputed line items
- revised_language: Optional suggested revisions to estimate language if carrier feedback has merit (can be null)
- closing_statement: Professional closing that reinforces the defensibility of the claim`;

  const responseSchema = {
    type: 'object',
    properties: {
      opening_statement: { type: 'string' },
      rebuttal_points: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            point: { type: 'string' },
            supporting_evidence: { type: 'string' }
          }
        }
      },
      documentation_references: {
        type: 'array',
        items: { type: 'string' }
      },
      justification_citations: {
        type: 'array',
        items: { type: 'string' }
      },
      revised_language: { type: 'string' },
      closing_statement: { type: 'string' }
    }
  };

  const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: responseSchema,
    model: 'claude_sonnet_4_6',
  });

  return Response.json({ carrier_response: response });
});