import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Calculate team performance metrics
 * Aggregates estimate accuracy, approval rates, supplement success, and turnaround times
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    return Response.json({ error: 'Forbidden: Manager or Admin access required' }, { status: 403 });
  }

  // Resolve calling user's company — never query cross-tenant data
  const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id, is_deleted: false,
  });
  if (!callerProfiles.length) {
    return Response.json({ error: 'No company profile found' }, { status: 403 });
  }
  const company_id = callerProfiles[0].company_id;

  try {
    const body = await req.json();
    const { period_days = 30 } = body;

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - period_days * 24 * 60 * 60 * 1000);

    // Scoped to calling user's company only
    const allEstimates = await base44.asServiceRole.entities.EstimateDraft.filter({
      company_id,
      is_deleted: false,
    });

    const estimatesInPeriod = allEstimates.filter(e => {
      const createdDate = new Date(e.created_date);
      return createdDate >= periodStart && createdDate <= periodEnd;
    });

    // Scoped to calling user's company only
    const allOutcomes = await base44.asServiceRole.entities.ClaimOutcome.filter({
      company_id,
      is_deleted: false,
    });

    // Scoped to calling user's company only
    const allSupplements = await base44.asServiceRole.entities.Supplement.filter({
      company_id,
      is_deleted: false,
    });

    // Group estimates by created_by (user)
    const userMetrics = {};

    estimatesInPeriod.forEach(estimate => {
      const userId = estimate.created_by || 'unknown';
      
      if (!userMetrics[userId]) {
        userMetrics[userId] = {
          user_email: userId,
          estimates_created: 0,
          estimates_approved: 0,
          total_estimate_value: 0,
          turnaround_times: [],
          outcomes: [],
        };
      }

      userMetrics[userId].estimates_created += 1;
      userMetrics[userId].total_estimate_value += estimate.total || 0;

      // Track if approved
      if (estimate.status === 'approved') {
        userMetrics[userId].estimates_approved += 1;
      }

      // Calculate turnaround time (if approved)
      if (estimate.approved_at && estimate.created_date) {
        const createdTime = new Date(estimate.created_date).getTime();
        const approvedTime = new Date(estimate.approved_at).getTime();
        const hoursToApprove = (approvedTime - createdTime) / (1000 * 60 * 60);
        if (hoursToApprove >= 0 && hoursToApprove < 1000) {
          userMetrics[userId].turnaround_times.push(hoursToApprove);
        }
      }

      // Fetch related outcome for accuracy
      const outcome = allOutcomes.find(o => o.estimate_version_id === estimate.id);
      if (outcome) {
        userMetrics[userId].outcomes.push(outcome);
      }
    });

    // Calculate supplements per user
    allSupplements.forEach(supp => {
      const userId = supp.created_by || 'unknown';
      if (!userMetrics[userId]) {
        userMetrics[userId] = {
          user_email: userId,
          estimates_created: 0,
          estimates_approved: 0,
          total_estimate_value: 0,
          turnaround_times: [],
          outcomes: [],
          supplements_filed: 0,
          supplements_approved: 0,
        };
      }
      
      userMetrics[userId].supplements_filed = (userMetrics[userId].supplements_filed || 0) + 1;
      if (supp.status === 'approved') {
        userMetrics[userId].supplements_approved = (userMetrics[userId].supplements_approved || 0) + 1;
      }
    });

    // Calculate final metrics per user
    const results = Object.entries(userMetrics).map(([userId, metrics]) => {
      const avgTurnaround = metrics.turnaround_times.length > 0
        ? metrics.turnaround_times.reduce((a, b) => a + b, 0) / metrics.turnaround_times.length
        : 0;

      const approvalRate = metrics.estimates_created > 0
        ? (metrics.estimates_approved / metrics.estimates_created) * 100
        : 0;

      // Estimate accuracy: approved_amount / requested_amount
      const accuracyValues = metrics.outcomes
        .filter(o => o.approved_amount && o.requested_amount)
        .map(o => (o.approved_amount / o.requested_amount) * 100);
      
      const estimateAccuracy = accuracyValues.length > 0
        ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length
        : 100;

      const supplementSuccess = metrics.supplements_filed > 0
        ? (metrics.supplements_approved / metrics.supplements_filed) * 100
        : 0;

      const avgEstimateValue = metrics.estimates_created > 0
        ? metrics.total_estimate_value / metrics.estimates_created
        : 0;

      return {
        user_id: userId,
        user_email: metrics.user_email,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        estimate_accuracy_percent: Math.round(estimateAccuracy * 10) / 10,
        approval_rate_percent: Math.round(approvalRate * 10) / 10,
        supplement_success_percent: Math.round(supplementSuccess * 10) / 10,
        avg_turnaround_hours: Math.round(avgTurnaround * 10) / 10,
        estimates_created: metrics.estimates_created,
        estimates_approved: metrics.estimates_approved,
        supplements_filed: metrics.supplements_filed || 0,
        supplements_approved: metrics.supplements_approved || 0,
        total_estimate_value: Math.round(metrics.total_estimate_value),
        avg_estimate_value: Math.round(avgEstimateValue),
      };
    });

    // Upsert into UserPerformance entity
    for (const metric of results) {
      // Find existing record
      const existing = await base44.asServiceRole.entities.UserPerformance.filter({
        user_email: metric.user_email,
        period_start: metric.period_start,
        is_deleted: false,
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.UserPerformance.update(existing[0].id, {
          ...metric,
          company_id,
        });
      } else {
        await base44.asServiceRole.entities.UserPerformance.create({
          ...metric,
          company_id,
        });
      }
    }

    return Response.json({
      success: true,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      metrics: results.sort((a, b) => b.estimates_created - a.estimates_created),
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});