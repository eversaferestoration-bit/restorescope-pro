import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== 'create' || event?.entity_name !== 'LeadTask') {
      return Response.json({ ok: true });
    }

    const task = data;
    if (!task?.company_id || !task?.assigned_to) {
      return Response.json({ ok: true });
    }

    // Get the assigned user
    const users = await base44.asServiceRole.entities.UserProfile.filter(
      { email: task.assigned_to, company_id: task.company_id },
      '-created_date',
      1
    );

    if (!users || users.length === 0) {
      return Response.json({ ok: true });
    }

    const assignedUser = users[0];

    // Create notification for the assigned user
    await base44.asServiceRole.entities.Notification.create({
      company_id: task.company_id,
      user_id: assignedUser.user_id,
      type: 'task_assignment',
      title: 'Task Assigned to You',
      message: `New task: "${task.title}" - Priority: ${task.priority || 'medium'}`,
      read_status: false,
      linked_record: {
        entity_type: 'LeadTask',
        entity_id: task.id,
        link_url: `/crm/${task.lead_id}`,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('onTaskAssigned Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});