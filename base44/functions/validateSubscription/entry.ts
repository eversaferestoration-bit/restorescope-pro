import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { company_id } = await req.json();
  if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });

  // Verify user belongs to this company
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: not a member of this company' }, { status: 403 });
  }

  const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id, is_deleted: false });
  if (!companies.length) return Response.json({ error: 'Company not found' }, { status: 404 });
  const company = companies[0];

  const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ company_id });
  const subscription = subscriptions[0] || null;

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const now = new Date();
  const trialActive = subscription?.trial_end ? new Date(subscription.trial_end) > now : false;

  return Response.json({
    valid: isActive || trialActive,
    status: subscription?.status || 'none',
    plan_id: company.plan_id || null,
    seat_limit: company.seat_limit || 0,
    monthly_job_limit: company.monthly_job_limit || 0,
    trial_end: subscription?.trial_end || null,
  });
});