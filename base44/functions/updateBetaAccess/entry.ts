import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { company_id, action } = await req.json();

    if (!company_id || !action) {
      return Response.json({ error: 'company_id and action are required' }, { status: 400 });
    }

    const today = new Date();
    let updateData = {};
    let description = '';

    if (action === 'enable') {
      const end = new Date(today);
      end.setDate(end.getDate() + 14);
      updateData = {
        is_beta_user: true,
        beta_status: 'active',
        beta_start_date: today.toISOString().split('T')[0],
        beta_end_date: end.toISOString().split('T')[0],
      };
      description = `Beta access enabled (14-day trial) by ${user.email}`;

    } else if (action === 'extend') {
      // Read current end date to extend from
      const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id, is_deleted: false });
      if (!companies.length) return Response.json({ error: 'Company not found' }, { status: 404 });
      const company = companies[0];
      const currentEnd = company.beta_end_date ? new Date(company.beta_end_date) : today;
      const base = currentEnd > today ? currentEnd : today;
      const newEnd = new Date(base);
      newEnd.setDate(newEnd.getDate() + 7);
      updateData = {
        beta_end_date: newEnd.toISOString().split('T')[0],
        beta_status: 'active',
        is_beta_user: true,
      };
      description = `Beta extended +7 days (new end: ${newEnd.toISOString().split('T')[0]}) by ${user.email}`;

    } else if (action === 'end') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      updateData = {
        beta_end_date: yesterday.toISOString().split('T')[0],
        beta_status: 'expired',
      };
      description = `Beta access ended by ${user.email}`;

    } else if (action === 'paid') {
      updateData = {
        is_beta_user: false,
        beta_status: 'expired',
        status: 'active',
      };
      description = `Converted to paid by ${user.email}`;

    } else {
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Perform the update via service role
    await base44.asServiceRole.entities.Company.update(company_id, updateData);

    // Write audit log
    await base44.asServiceRole.entities.AuditLog.create({
      company_id: company_id,
      entity_type: 'Company',
      entity_id: company_id,
      action: `beta_${action}`,
      actor_email: user.email,
      actor_id: user.id,
      description,
      metadata: { action, updated_fields: Object.keys(updateData) },
    });

    console.log(`[updateBetaAccess] action=${action} company_id=${company_id} by ${user.email}`);

    return Response.json({ success: true, action, company_id });
  } catch (error) {
    console.error('[updateBetaAccess] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});