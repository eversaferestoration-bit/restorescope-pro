import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== 'create' || event?.entity_name !== 'CRMLead') {
      return Response.json({ ok: true });
    }

    const lead = data;
    if (!lead?.company_id) {
      return Response.json({ ok: true });
    }

    // Get users for this company
    const users = await base44.asServiceRole.entities.UserProfile.filter(
      { company_id: lead.company_id, is_deleted: false },
      '-created_date',
      100
    );

    if (!users || users.length === 0) {
      return Response.json({ ok: true });
    }

    // Create notification for all company users
    const notifications = users.map((user) => ({
      company_id: lead.company_id,
      user_id: user.user_id,
      type: 'new_lead',
      title: 'New Lead',
      message: `${lead.customer_name} from ${lead.city || 'unknown location'} - ${lead.service_type || 'General'}`,
      read_status: false,
      linked_record: {
        entity_type: 'CRMLead',
        entity_id: lead.id,
        link_url: `/crm/${lead.id}`,
      },
    }));

    await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

    return Response.json({ ok: true, count: notifications.length });
  } catch (error) {
    console.error('onLeadCreated Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});