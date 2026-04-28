import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();

    if (!user?.id || !user?.email) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let companyList = await base44.asServiceRole.entities.Company.filter({
      is_deleted: false,
    }).catch(() => []);

    let company = companyList?.[0];

    if (!company) {
      company = await base44.asServiceRole.entities.Company.create({
        name: 'Eversafe Restoration',
        is_deleted: false,
      });
    }

    let profiles = await base44.asServiceRole.entities.UserProfile.filter({
      email: user.email,
      is_deleted: false,
    }).catch(() => []);

    let profile = profiles?.[0];

    const payload = {
      user_id: user.id,
      email: user.email,
      company_id: company.id,
      full_name: user.full_name || user.name || 'Admin',
      role: 'admin',
      status: 'active',
      onboarding_status: 'onboarding_completed',
      current_onboarding_step: 6,
      completed_steps: [1, 2, 3, 4, 5, 6],
      onboarding_completed_at: new Date().toISOString(),
      is_deleted: false,
    };

    if (profile?.id) {
      profile = await base44.asServiceRole.entities.UserProfile.update(profile.id, payload);
    } else {
      profile = await base44.asServiceRole.entities.UserProfile.create(payload);
    }

    return Response.json({
      success: true,
      company,
      profile,
    });

  } catch (err) {
    return Response.json({
      success: false,
      error: err?.message || 'Failed',
    }, { status: 500 });
  }
});