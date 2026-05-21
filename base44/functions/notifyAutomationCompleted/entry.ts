import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { user_id, company_id, automation_name, result_summary } = body;

    await base44.asServiceRole.entities.Notification.create({
      company_id,
      user_id,
      type: 'automation_completed',
      title: `Automation Completed - ${automation_name}`,
      message: result_summary || `The "${automation_name}" automation has completed successfully.`,
      read_status: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Automation Completed Notification Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});