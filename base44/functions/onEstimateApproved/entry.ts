import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== 'update' || event?.entity_name !== 'Estimate') {
      return Response.json({ ok: true });
    }

    const estimate = data;
    if (!estimate?.company_id || estimate.status !== 'approved') {
      return Response.json({ ok: true });
    }

    // Get users for this company
    const users = await base44.asServiceRole.entities.UserProfile.filter(
      { company_id: estimate.company_id, is_deleted: false },
      '-created_date',
      100
    );

    if (!users || users.length === 0) {
      return Response.json({ ok: true });
    }

    // Create notification for all company users
    const notifications = users.map((user) => ({
      company_id: estimate.company_id,
      user_id: user.user_id,
      type: 'estimate_approval',
      title: 'Estimate Approved',
      message: `Estimate #${estimate.estimate_number} for ${estimate.customer_name} has been approved - Total: $${estimate.total?.toFixed(2) || '0.00'}`,
      read_status: false,
      linked_record: {
        entity_type: 'Estimate',
        entity_id: estimate.id,
        link_url: `/estimate/job/${estimate.job_id}`,
      },
    }));

    await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

    return Response.json({ ok: true, count: notifications.length });
  } catch (error) {
    console.error('onEstimateApproved Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});