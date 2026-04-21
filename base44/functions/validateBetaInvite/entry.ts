import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return Response.json({ valid: false, message: 'No code provided' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const normalized = code.trim().toUpperCase();

    const invites = await base44.asServiceRole.entities.BetaInvite.filter({
      code: normalized,
      is_active: true,
      is_deleted: false,
    });

    if (invites.length === 0) {
      return Response.json({ valid: false, message: 'Invalid invite code.' });
    }

    const invite = invites[0];

    // Check expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ valid: false, message: 'This invite code has expired.' });
    }

    // Check max uses
    if (invite.max_uses != null && (invite.uses_count || 0) >= invite.max_uses) {
      return Response.json({ valid: false, message: 'This invite code has reached its usage limit.' });
    }

    return Response.json({ valid: true, trial_days: invite.trial_days });
  } catch (error) {
    console.error('[VALIDATE_INVITE_ERROR]', error);
    return Response.json({ valid: false, message: 'Could not validate invite code.' }, { status: 500 });
  }
});