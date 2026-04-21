import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Authenticate caller
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log(`[getBetaCompanies] Fetch started by ${user.email}`);

    // Bypass RLS to read ALL companies
    const raw = await base44.asServiceRole.entities.Company.filter(
      { is_deleted: false },
      'name',
      500
    );

    console.log(`[getBetaCompanies] Fetched ${raw.length} companies`);

    const today = new Date();

    const companies = raw.map((c) => {
      try {
        // Derive computed beta status
        let betaStatus = 'none';
        if (c.is_beta_user) {
          if (c.beta_status === 'expired') {
            betaStatus = 'expired';
          } else if (c.beta_end_date) {
            const end = new Date(c.beta_end_date);
            betaStatus = end < today ? 'expired' : 'active';
          } else if (c.beta_status === 'active') {
            betaStatus = 'active';
          }
        }

        // Days remaining
        let daysRemaining = 0;
        if (betaStatus === 'active' && c.beta_end_date) {
          const end = new Date(c.beta_end_date);
          daysRemaining = Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
        }

        return {
          id: c.id,
          name: c.name || '(Unnamed)',
          email: c.email || null,
          is_beta_user: c.is_beta_user || false,
          beta_status: betaStatus,
          beta_start_date: c.beta_start_date || null,
          beta_end_date: c.beta_end_date || null,
          days_remaining: daysRemaining,
          status: c.status || null,
        };
      } catch (err) {
        console.warn(`[getBetaCompanies] Skipping malformed company ${c?.id}:`, err.message);
        return null;
      }
    }).filter(Boolean);

    return Response.json({ companies });
  } catch (error) {
    console.error('[getBetaCompanies] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});