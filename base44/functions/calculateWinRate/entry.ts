import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * POST /api/calculateWinRate
 * Calculate win rate metrics for a job based on claim outcomes
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { job_id } = body;

  if (!job_id) {
    return Response.json({ error: 'job_id required' }, { status: 400 });
  }

  // Get user's company
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id,
    is_deleted: false,
  });

  if (!profiles.length) {
    return Response.json({ error: 'User profile not found' }, { status: 404 });
  }

  const company_id = profiles[0].company_id;

  // Get job
  const jobs = await base44.asServiceRole.entities.Job.filter({
    id: job_id,
    company_id,
    is_deleted: false,
  });

  if (!jobs.length) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  const job = jobs[0];

  // Get all claim outcomes for this job
  const outcomes = await base44.asServiceRole.entities.ClaimOutcome.filter({
    job_id,
    company_id,
    is_deleted: false,
  });

  if (!outcomes.length) {
    return Response.json({
      success: true,
      job_id,
      approval_percentage: 0,
      supplement_success_rate: 0,
      total_requested: 0,
      total_recovered: 0,
      recovery_ratio: 0,
      supplement_count: 0,
      supplements_approved: 0,
      outcomes: []
    });
  }

  // Calculate metrics
  let totalRequested = 0;
  let totalApproved = 0;
  let totalSupplements = 0;
  let totalSupplementsApproved = 0;
  let totalSupplementAmount = 0;

  outcomes.forEach(outcome => {
    totalRequested += outcome.requested_amount || 0;
    totalApproved += outcome.approved_amount || 0;
    totalSupplements += outcome.supplement_count || 0;
    totalSupplementsApproved += outcome.supplements_approved || 0;
    totalSupplementAmount += outcome.supplement_amount || 0;
  });

  const approvalPercentage = totalRequested > 0 
    ? Math.round((totalApproved / totalRequested) * 100) 
    : 0;

  const supplementSuccessRate = totalSupplements > 0
    ? Math.round((totalSupplementsApproved / totalSupplements) * 100)
    : 0;

  const finalAmount = totalApproved + totalSupplementAmount;
  const recoveryRatio = totalRequested > 0
    ? Math.round((finalAmount / totalRequested) * 100)
    : 0;

  return Response.json({
    success: true,
    job_id,
    approval_percentage: approvalPercentage,
    supplement_success_rate: supplementSuccessRate,
    total_requested: totalRequested,
    total_approved: totalApproved,
    total_recovered: finalAmount,
    recovery_ratio: recoveryRatio,
    supplement_count: totalSupplements,
    supplements_approved: totalSupplementsApproved,
    supplement_amount: totalSupplementAmount,
    outcomes_count: outcomes.length,
    outcomes: outcomes.map(o => ({
      id: o.id,
      estimate_version_id: o.estimate_version_id,
      requested_amount: o.requested_amount,
      approved_amount: o.approved_amount,
      supplement_amount: o.supplement_amount,
      final_amount: o.final_amount,
      win_rate_percent: o.win_rate_percent,
      status: o.status,
      closed_date: o.closed_date,
    })),
  });
});