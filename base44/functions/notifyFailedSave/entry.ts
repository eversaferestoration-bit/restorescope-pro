import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { user_id, company_id, entity_type, error_message } = body;

    await base44.asServiceRole.entities.Notification.create({
      company_id,
      user_id,
      type: 'failed_save',
      title: `Failed to Save ${entity_type}`,
      message: `An error occurred while saving your ${entity_type.toLowerCase()}: ${error_message}. Please try again or contact support.`,
      read_status: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed Save Notification Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});