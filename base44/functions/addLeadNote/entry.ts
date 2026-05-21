import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { lead_id, content, note_type = 'internal_comment' } = body;

  if (!lead_id || !content) {
    return Response.json({ error: 'lead_id and content required' }, { status: 400 });
  }

  // Get lead
  let lead;
  try { lead = await base44.asServiceRole.entities.Lead.get(lead_id); } catch { lead = null; }
  if (!lead || lead.is_deleted) {
    return Response.json({ error: 'Lead not found' }, { status: 404 });
  }

  // Verify access
  const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  if (!userProfiles.find(p => p.company_id === lead.company_id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Create note
  const note = await base44.asServiceRole.entities.LeadNote.create({
    company_id: lead.company_id,
    lead_id,
    note_type,
    content,
    created_by: user.email,
    created_by_name: user.full_name,
    is_internal: note_type === 'internal_comment',
  });

  // Log activity
  await base44.asServiceRole.entities.LeadActivity.create({
    company_id: lead.company_id,
    lead_id,
    activity_type: 'note',
    title: `${note_type === 'internal_comment' ? 'Internal note' : 'Customer note'} added`,
    description: content.substring(0, 100),
    created_by: user.email,
    created_by_name: user.full_name,
  }).catch(err => console.warn('Activity log failed:', err?.message));

  // Update lead activity timestamp
  await base44.asServiceRole.entities.Lead.update(lead_id, {
    last_activity_at: new Date().toISOString(),
  }).catch(err => console.warn('Lead update failed:', err?.message));

  return Response.json({ note });
});