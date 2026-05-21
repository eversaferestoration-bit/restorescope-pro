import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { lead_id, reminder_type, title, description, assigned_to, due_date, metadata } = body;

  if (!lead_id || !reminder_type || !title) {
    return Response.json({ error: 'lead_id, reminder_type, and title required' }, { status: 400 });
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

  // Create reminder
  const reminder = await base44.asServiceRole.entities.LeadReminder.create({
    company_id: lead.company_id,
    lead_id,
    reminder_type,
    title,
    description: description || '',
    assigned_to: assigned_to || user.email,
    due_date: due_date || new Date().toISOString(),
    status: 'pending',
    triggered_at: new Date().toISOString(),
    metadata: metadata || {},
  });

  // Update lead next reminder
  const nextReminder = new Date(due_date || Date.now());
  if (!lead.next_reminder_at || new Date(due_date) < new Date(lead.next_reminder_at)) {
    await base44.asServiceRole.entities.Lead.update(lead_id, {
      next_reminder_at: nextReminder.toISOString(),
    }).catch(err => console.warn('Lead update failed:', err?.message));
  }

  return Response.json({ reminder });
});