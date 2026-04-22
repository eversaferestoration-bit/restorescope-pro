import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONFIDENCE_REVIEW_THRESHOLD = 0.65;

const SYSTEM_PROMPT = `You are an expert restoration damage analyst for water, fire, mold, and structural damage.
You analyze site photos and produce structured damage assessments to assist technicians and estimators.

IMPORTANT RULES:
- You SUGGEST only. You do NOT finalize pricing or scope.
- Be conservative: when uncertain, lower your confidence score and flag for manual review.
- scope_suggestions are line-item hints only (e.g. "Replace drywall 4x8 section"), not final estimates.
- next_step should be a single actionable instruction for the field technician.

Respond with a valid JSON object — no markdown fences, no extra text.`;

const USER_PROMPT = `Analyze this restoration damage photo and return a JSON object with EXACTLY these fields:

{
  "damage_type": string (one of: water_damage, mold, fire_smoke, structural, contents, unknown),
  "material_type": string (e.g. "drywall", "hardwood_floor", "carpet", "concrete", "wood_framing", "tile", "unknown"),
  "surface": string (one of: wall, ceiling, floor, structural_member, contents, unknown),
  "severity_score": number (0.0 to 1.0 — 0=none, 0.25=minor, 0.5=moderate, 0.75=major, 1.0=catastrophic),
  "confidence_score": number (0.0 to 1.0 — how confident you are in this assessment),
  "next_step": string (one clear action for the technician, max 120 chars),
  "scope_suggestions": array of strings (1-4 line-item suggestions, each max 100 chars),
  "manual_review_required": boolean (true if confidence < 0.65, or damage is ambiguous, or structural risk present)
}`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { photo_id, file_url, job_id } = body;

  if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });
  if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });

  // Verify job access
  const job = await base44.asServiceRole.entities.Job.get(job_id).catch(() => null);
  if (!job || job.is_deleted) return Response.json({ error: 'Job not found' }, { status: 404 });

  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Call LLM with vision
  let analysis;
  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_PROMPT}\n\n${USER_PROMPT}`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          damage_type: { type: 'string' },
          material_type: { type: 'string' },
          surface: { type: 'string' },
          severity_score: { type: 'number' },
          confidence_score: { type: 'number' },
          next_step: { type: 'string' },
          scope_suggestions: { type: 'array', items: { type: 'string' } },
          manual_review_required: { type: 'boolean' },
        },
        required: ['damage_type', 'material_type', 'surface', 'severity_score', 'confidence_score', 'next_step', 'scope_suggestions', 'manual_review_required'],
      },
    });
    analysis = result;
  } catch (err) {
    return Response.json({ error: `AI analysis failed: ${err.message}` }, { status: 500 });
  }

  // Force manual_review_required if confidence is below threshold
  if (analysis.confidence_score < CONFIDENCE_REVIEW_THRESHOLD) {
    analysis.manual_review_required = true;
  }
  // Also force review for structural damage
  if (analysis.damage_type === 'structural') {
    analysis.manual_review_required = true;
  }

  // Persist results back to Photo entity if photo_id provided
  if (photo_id) {
    await base44.asServiceRole.entities.Photo.update(photo_id, {
      analysis_status: 'analysis_complete',
      damage_tags: [analysis.damage_type, analysis.material_type].filter(Boolean),
      material_tags: [analysis.material_type, analysis.surface].filter(Boolean),
      severity_score: analysis.severity_score,
      confidence_score: analysis.confidence_score,
      manual_review_required: analysis.manual_review_required,
    });
  }

  // Log the AI action
  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Photo',
    entity_id: photo_id || '',
    action: 'ai_analyzed',
    actor_email: user.email,
    actor_id: user.id,
    description: `AI analysis: ${analysis.damage_type} (severity ${analysis.severity_score?.toFixed(2)}, confidence ${analysis.confidence_score?.toFixed(2)})${analysis.manual_review_required ? ' — review required' : ''}`,
    metadata: { job_id, photo_id, damage_type: analysis.damage_type, severity_score: analysis.severity_score, confidence_score: analysis.confidence_score, manual_review_required: analysis.manual_review_required },
  });

  return Response.json({ analysis, suggestion_only: true });
});