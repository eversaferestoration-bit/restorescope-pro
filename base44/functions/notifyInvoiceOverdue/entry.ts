import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { invoice_id, customer_name, company_id, assigned_to_email } = body;

    // Get user by email to find user_id
    const users = await base44.asServiceRole.entities.User.filter({
      email: assigned_to_email,
    });

    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    await base44.asServiceRole.entities.Notification.create({
      company_id,
      user_id: user.id,
      type: 'invoice_overdue',
      title: `Invoice Overdue - ${customer_name}`,
      message: `An invoice for ${customer_name} is now overdue and requires immediate attention.`,
      read_status: false,
      linked_record: {
        entity_type: 'Invoice',
        entity_id: invoice_id,
        link_url: '/invoices/' + invoice_id,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Invoice Overdue Notification Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});