import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `BETA-${seg()}-${seg()}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { label, trial_days = 30, max_uses, expires_at } = await req.json();

    const code = generateCode();

    const invite = await base44.asServiceRole.entities.BetaInvite.create({
      code,
      label: label || `Beta invite - ${new Date().toLocaleDateString()}`,
      trial_days,
      max_uses: max_uses || null,
      uses_count: 0,
      is_active: true,
      expires_at: expires_at || null,
      created_by: user.email,
      redeemed_by: [],
      is_deleted: false,
    });

    return Response.json({ invite });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});