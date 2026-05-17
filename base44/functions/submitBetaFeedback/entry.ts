import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VALID_TYPES = ['bug', 'feature_request', 'confusion', 'praise', 'other'];
const VALID_SEVERITY = ['low', 'medium', 'high', 'critical'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { feedback_type, title, description, page_url, severity, screenshot_url } = body;

  if (!feedback_type || !VALID_TYPES.includes(feedback_type)) {
    return Response.json({ error: `feedback_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }
  if (!title || title.trim().length < 3) {
    return Response.json({ error: 'title must be at least 3 characters' }, { status: 400 });
  }
  if (!description || description.trim().length < 10) {
    return Response.json({ error: 'description must be at least 10 characters' }, { status: 400 });
  }
  if (severity && !VALID_SEVERITY.includes(severity)) {
    return Response.json({ error: `severity must be one of: ${VALID_SEVERITY.join(', ')}` }, { status: 400 });
  }

  // Resolve company
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  const company_id = profiles[0]?.company_id || 'unknown';

  const entry = await base44.asServiceRole.entities.AuditLog.create({
    company_id,
    entity_type: 'BetaFeedback',
    entity_id: `feedback-${Date.now()}`,
    action: feedback_type,
    actor_email: user.email,
    actor_id: user.id,
    description: `[BETA FEEDBACK] ${title}`,
    metadata: {
      feedback_type,
      title: title.trim().substring(0, 200),
      description: description.trim().substring(0, 2000),
      severity: severity || 'medium',
      page_url: page_url || null,
      screenshot_url: screenshot_url || null,
      user_role: user.role,
      submitted_at: new Date().toISOString(),
    },
  });

  return Response.json({ success: true, feedback_id: entry.id, message: 'Thank you for your feedback!' });
});