import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { lead_id, title, description, assigned_to, due_date, priority } = body;

  if (!lead_id || !title) return Response.json({ error: 'lead_id and title required' }, { status: 400 });

  let lead;
  try { lead = await base44.asServiceRole.entities.CRMLead.get(lead_id); } catch { lead = null; }
  if (!lead || lead.is_deleted) return Response.json({ error: 'Lead not found' }, { status: 404 });

  const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  const userCompanyId = userProfiles[0]?.company_id;
  if (!userCompanyId || userCompanyId !== lead.company_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const task = await base44.asServiceRole.entities.LeadTask.create({
    company_id: lead.company_id,
    lead_id,
    title,
    description: description || null,
    assigned_to: assigned_to || null,
    due_date: due_date || null,
    priority: priority || 'medium',
    status: 'open',
    is_deleted: false,
  });

  // Log activity
  await base44.asServiceRole.entities.LeadActivity.create({
    company_id: lead.company_id,
    lead_id,
    activity_type: 'task_created',
    description: `Task created: ${title}`,
    actor_email: user.email,
  }).catch(() => {});

  return Response.json({ task });
});