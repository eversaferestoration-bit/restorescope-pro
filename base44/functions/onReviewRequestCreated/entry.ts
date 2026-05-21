import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== 'create' || event?.entity_name !== 'ReviewRequest') {
      return Response.json({ ok: true });
    }

    const reviewRequest = data;
    if (!reviewRequest?.company_id) {
      return Response.json({ ok: true });
    }

    // Get users for this company
    const users = await base44.asServiceRole.entities.UserProfile.filter(
      { company_id: reviewRequest.company_id, is_deleted: false },
      '-created_date',
      100
    );

    if (!users || users.length === 0) {
      return Response.json({ ok: true });
    }

    // Create notification for all company users
    const notifications = users.map((user) => ({
      company_id: reviewRequest.company_id,
      user_id: user.user_id,
      type: 'review_request',
      title: 'Review Request Sent',
      message: `Review request sent to ${reviewRequest.customer_name} for ${reviewRequest.job_type || 'service'} in ${reviewRequest.city || 'location'}`,
      read_status: false,
      linked_record: {
        entity_type: 'ReviewRequest',
        entity_id: reviewRequest.id,
        link_url: '/restorereach/reviews',
      },
    }));

    await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

    return Response.json({ ok: true, count: notifications.length });
  } catch (error) {
    console.error('onReviewRequestCreated Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});