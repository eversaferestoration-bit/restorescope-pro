import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== 'create' || event?.entity_name !== 'StormEvent') {
      return Response.json({ ok: true });
    }

    const stormEvent = data;
    if (!stormEvent?.company_id) {
      return Response.json({ ok: true });
    }

    // Get users for this company
    const users = await base44.asServiceRole.entities.UserProfile.filter(
      { company_id: stormEvent.company_id, is_deleted: false },
      '-created_date',
      100
    );

    if (!users || users.length === 0) {
      return Response.json({ ok: true });
    }

    // Create notification for all company users
    const notifications = users.map((user) => ({
      company_id: stormEvent.company_id,
      user_id: user.user_id,
      type: 'storm_event',
      title: 'Storm Event Detected',
      message: `${stormEvent.event_type} in ${stormEvent.affected_city} - Severity: ${stormEvent.severity}`,
      read_status: false,
      linked_record: {
        entity_type: 'StormEvent',
        entity_id: stormEvent.id,
        link_url: '/restorereach/storm',
      },
    }));

    await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

    return Response.json({ ok: true, count: notifications.length });
  } catch (error) {
    console.error('onStormEventCreated Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});