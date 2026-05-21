import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { lead_id, content, note_type } = body;

  if (!lead_id || !content) return Response.json({ error: 'lead_id and content required' }, { status: 400 });

  let lead;
  try { lead = await base44.asServiceRole.entities.CRMLead.get(lead_id); } catch { lead = null; }
  if (!lead || lead.is_deleted) return Response.json({ error: 'Lead not found' }, { status: 404 });

  const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  const userCompanyId = userProfiles[0]?.company_id;
  if (!userCompanyId || userCompanyId !== lead.company_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const note = await base44.asServiceRole.entities.LeadNote.create({
    company_id: lead.company_id,
    lead_id,
    content,
    note_type: note_type || 'internal_comment',
    is_deleted: false,
  });

  // Update lead activity
  await base44.asServiceRole.entities.LeadActivity.create({
    company_id: lead.company_id,
    lead_id,
    activity_type: 'note_added',
    description: 'Internal comment added',
    actor_email: user.email,
  }).catch(() => {});

  // Update last activity timestamp
  await base44.asServiceRole.entities.CRMLead.update(lead_id, {
    last_activity_at: new Date().toISOString(),
  }).catch(() => {});

  return Response.json({ note });
});