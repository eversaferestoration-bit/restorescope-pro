import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Activates beta access for a company.
 * Admin-only.
 *
 * Payload:
 *   company_id   — required
 *   duration_days — optional, defaults to 14
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { company_id, duration_days = 14 } = await req.json();

    if (!company_id) {
      return Response.json({ error: 'company_id is required' }, { status: 400 });
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + duration_days);

    const formatDate = (d) => d.toISOString().split('T')[0]; // YYYY-MM-DD

    await base44.asServiceRole.entities.Company.update(company_id, {
      is_beta_user: true,
      beta_start_date: formatDate(now),
      beta_end_date: formatDate(endDate),
      beta_status: 'active',
    });

    return Response.json({
      success: true,
      company_id,
      beta_start_date: formatDate(now),
      beta_end_date: formatDate(endDate),
      duration_days,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});