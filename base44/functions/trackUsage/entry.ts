import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Tracks usage for billing and overage calculations.
 * Called when AI analyses are performed, jobs are created, etc.
 * Access: Owner_Admin only (billing-sensitive writes).
 */

const FORBIDDEN = Response.json(
  { success: false, message: 'Forbidden', code: 'FORBIDDEN' },
  { status: 403 }
);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  // Only Owner_Admin may modify usage/billing statistics
  if (user.role !== 'admin') {
    base44.asServiceRole.entities.AuditLog.create({
      company_id: user.company_id || '',
      entity_type: 'function',
      entity_id: 'trackUsage',
      action: 'forbidden',
      actor_email: user.email,
      actor_id: user.id,
      description: `Forbidden access attempt to trackUsage by role: ${user.role}`,
    }).catch(() => {});
    return FORBIDDEN;
  }

  const body = await req.json();
  const { company_id, usage_type, amount = 1 } = body;

  if (!company_id || !usage_type) {
    return Response.json({ error: 'company_id and usage_type required' }, { status: 400 });
  }

  // Validate same-company access — admin can only track their own company
  if (user.company_id && company_id !== user.company_id) {
    base44.asServiceRole.entities.AuditLog.create({
      company_id: user.company_id,
      entity_type: 'function',
      entity_id: 'trackUsage',
      action: 'forbidden',
      actor_email: user.email,
      actor_id: user.id,
      description: `Cross-company usage tracking attempt for company ${company_id}`,
    }).catch(() => {});
    return FORBIDDEN;
  }

  // Get current subscription
  const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
    company_id,
    status: 'active',
  }, '-created_date', 1);

  if (!subscriptions.length) {
    return Response.json({
      tracked: true,
      subscription_required: true,
      message: 'No active subscription found'
    });
  }

  const subscription = subscriptions[0];

  // Get plan details
  let plan = null;
  if (subscription.provider_customer_id) {
    const plans = await base44.asServiceRole.entities.Plan.filter({
      code: subscription.provider_customer_id,
      is_active: true,
    });
    plan = plans[0] || null;
  }

  // Get or create current usage record
  const now = new Date();
  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = subscription.current_period_end
    || new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let usageRecords = await base44.asServiceRole.entities.UsageRecord.filter({
    subscription_id: subscription.id,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    status: 'active',
  });

  let usageRecord = usageRecords[0];

  if (!usageRecord) {
    usageRecord = await base44.asServiceRole.entities.UsageRecord.create({
      company_id,
      subscription_id: subscription.id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      jobs_limit: plan?.monthly_job_limit || 10,
      ai_analyses_limit: plan?.monthly_ai_limit || 50,
      storage_limit_mb: plan?.storage_limit_mb || 10240,
      status: 'active',
    });
  }

  let overage = 0;
  let overage_charge = 0;

  if (usage_type === 'job') {
    const newJobsUsed = (usageRecord.jobs_used || 0) + amount;
    const jobsLimit = usageRecord.jobs_limit || 10;
    await base44.asServiceRole.entities.UsageRecord.update(usageRecord.id, {
      jobs_used: newJobsUsed,
      overage_jobs: Math.max(0, newJobsUsed - jobsLimit),
    });
    if (newJobsUsed > jobsLimit) {
      overage = newJobsUsed - jobsLimit;
      overage_charge = overage * (plan?.overage_job_price || 5);
    }
  } else if (usage_type === 'ai_analysis') {
    const newAiUsed = (usageRecord.ai_analyses_used || 0) + amount;
    const aiLimit = usageRecord.ai_analyses_limit || 50;
    await base44.asServiceRole.entities.UsageRecord.update(usageRecord.id, {
      ai_analyses_used: newAiUsed,
      overage_ai: Math.max(0, newAiUsed - aiLimit),
    });
    if (newAiUsed > aiLimit) {
      overage = newAiUsed - aiLimit;
      overage_charge = overage * (plan?.overage_ai_price || 2);
    }
  } else if (usage_type === 'storage') {
    await base44.asServiceRole.entities.UsageRecord.update(usageRecord.id, {
      storage_used_mb: (usageRecord.storage_used_mb || 0) + amount,
    });
  }

  const currentOverageJobs = usageRecord.overage_jobs || 0;
  const currentOverageAi = usageRecord.overage_ai || 0;
  const totalOverageCharges = (currentOverageJobs * (plan?.overage_job_price || 5)) +
                               (currentOverageAi * (plan?.overage_ai_price || 2));

  await base44.asServiceRole.entities.UsageRecord.update(usageRecord.id, {
    overage_charges: totalOverageCharges,
    total_charges: totalOverageCharges,
  });

  return Response.json({
    tracked: true,
    usage_record_id: usageRecord.id,
    overage,
    overage_charge,
    total_overage_charges: totalOverageCharges,
    limit_reached: overage > 0,
    message: overage > 0
      ? `Limit exceeded. ${overage} overage units ($${overage_charge.toFixed(2)})`
      : 'Usage tracked successfully',
  });
});