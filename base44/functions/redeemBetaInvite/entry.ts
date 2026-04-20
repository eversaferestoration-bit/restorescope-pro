import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { addDays, format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invite_code, company_id } = await req.json();

    if (!invite_code || !company_id) {
      return Response.json({ error: 'invite_code and company_id are required' }, { status: 400 });
    }

    // Find the invite
    const invites = await base44.asServiceRole.entities.BetaInvite.filter({
      code: invite_code.trim().toUpperCase(),
      is_active: true,
      is_deleted: false,
    });

    if (!invites.length) {
      return Response.json({ error: 'Invalid or expired invite code' }, { status: 404 });
    }

    const invite = invites[0];

    // Check expiry date
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ error: 'This invite code has expired' }, { status: 410 });
    }

    // Check max uses
    if (invite.max_uses && invite.uses_count >= invite.max_uses) {
      return Response.json({ error: 'This invite code has reached its usage limit' }, { status: 410 });
    }

    // Check company not already redeemed
    const alreadyRedeemed = (invite.redeemed_by || []).includes(company_id);
    if (alreadyRedeemed) {
      return Response.json({ error: 'This company has already redeemed an invite code' }, { status: 409 });
    }

    // Calculate beta dates
    const startDate = new Date();
    const endDate = addDays(startDate, invite.trial_days);

    // Activate beta on company
    await base44.asServiceRole.entities.Company.update(company_id, {
      is_beta_user: true,
      beta_start_date: format(startDate, 'yyyy-MM-dd'),
      beta_end_date: format(endDate, 'yyyy-MM-dd'),
      beta_status: 'active',
    });

    // Update invite usage
    await base44.asServiceRole.entities.BetaInvite.update(invite.id, {
      uses_count: (invite.uses_count || 0) + 1,
      redeemed_by: [...(invite.redeemed_by || []), company_id],
    });

    return Response.json({
      success: true,
      beta_start_date: format(startDate, 'yyyy-MM-dd'),
      beta_end_date: format(endDate, 'yyyy-MM-dd'),
      trial_days: invite.trial_days,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});