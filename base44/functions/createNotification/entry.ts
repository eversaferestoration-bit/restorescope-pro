import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { company_id, user_id, type, title, message, linked_record } = body;

    if (!company_id || !user_id || !type || !title || !message) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      company_id,
      user_id,
      type,
      title,
      message,
      read_status: false,
      linked_record: linked_record || null,
    });

    return Response.json({ notification });
  } catch (error) {
    console.error('Create Notification Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});