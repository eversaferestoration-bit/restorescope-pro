import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { lead_id } = body;

  if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });

  let lead;
  try { lead = await base44.asServiceRole.entities.CRMLead.get(lead_id); } catch { lead = null; }
  if (!lead || lead.is_deleted) return Response.json({ error: 'Lead not found' }, { status: 404 });

  const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  const userCompanyId = userProfiles[0]?.company_id;
  if (!userCompanyId || userCompanyId !== lead.company_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const reminders = [];
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Reminder 1: Estimate sent but not followed up (3+ days)
  if (lead.pipeline_stage === 'estimate_sent' && lead.stage_changed_at) {
    const stageChangedDate = new Date(lead.stage_changed_at);
    if (stageChangedDate < threeDaysAgo) {
      const existing = await base44.asServiceRole.entities.LeadReminder.filter({
        lead_id,
        reminder_type: 'estimate_followup',
        is_dismissed: false,
      });
      if (!existing.length) {
        const reminder = await base44.asServiceRole.entities.LeadReminder.create({
          company_id: lead.company_id,
          lead_id,
          reminder_type: 'estimate_followup',
          description: 'Estimate sent 3+ days ago — follow up with customer',
          due_date: new Date().toISOString().split('T')[0],
          is_dismissed: false,
        });
        reminders.push(reminder);
      }
    }
  }

  // Reminder 2: No response in 3 days
  if (lead.last_contacted_at) {
    const lastContactDate = new Date(lead.last_contacted_at);
    if (lastContactDate < threeDaysAgo) {
      const existing = await base44.asServiceRole.entities.LeadReminder.filter({
        lead_id,
        reminder_type: 'no_response',
        is_dismissed: false,
      });
      if (!existing.length) {
        const reminder = await base44.asServiceRole.entities.LeadReminder.create({
          company_id: lead.company_id,
          lead_id,
          reminder_type: 'no_response',
          description: 'No response from customer in 3+ days',
          due_date: new Date().toISOString().split('T')[0],
          is_dismissed: false,
        });
        reminders.push(reminder);
      }
    }
  }

  // Reminder 3: Check for unpaid invoice
  if (lead.linked_invoice_id) {
    const existing = await base44.asServiceRole.entities.LeadReminder.filter({
      lead_id,
      reminder_type: 'unpaid_invoice',
      is_dismissed: false,
    });
    if (!existing.length) {
      const reminder = await base44.asServiceRole.entities.LeadReminder.create({
        company_id: lead.company_id,
        lead_id,
        reminder_type: 'unpaid_invoice',
        description: 'Invoice pending payment',
        due_date: new Date().toISOString().split('T')[0],
        is_dismissed: false,
      });
      reminders.push(reminder);
    }
  }

  // Reminder 4: Missing review request
  if (lead.pipeline_stage === 'won' && !lead.follow_up_needed) {
    const existing = await base44.asServiceRole.entities.LeadReminder.filter({
      lead_id,
      reminder_type: 'missing_review',
      is_dismissed: false,
    });
    if (!existing.length) {
      const reminder = await base44.asServiceRole.entities.LeadReminder.create({
        company_id: lead.company_id,
        lead_id,
        reminder_type: 'missing_review',
        description: 'Send review request to completed customer',
        due_date: new Date().toISOString().split('T')[0],
        is_dismissed: false,
      });
      reminders.push(reminder);
    }
  }

  return Response.json({ reminders });
});