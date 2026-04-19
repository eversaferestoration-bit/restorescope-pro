import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Provides comprehensive analytics for company performance tracking.
 * Returns metrics on job value, approval rates, supplements, turnaround times, profit trends, and risk scores.
 * Company data is strictly isolated.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Authentication - manager/admin only
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    return Response.json({ error: 'Forbidden', message: 'Manager or admin access required.' }, { status: 403 });
  }

  // Get user's company
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
    user_id: user.id, 
    is_deleted: false 
  });
  
  if (!profiles.length) {
    return Response.json({ error: 'User profile not found' }, { status: 404 });
  }
  
  const company_id = profiles[0].company_id;
  const timeRange = await req.json().then(b => b.time_range || '30d').catch(() => '30d');

  // Calculate date range
  const now = new Date();
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
  const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

  // Load all jobs for this company
  const jobs = await base44.asServiceRole.entities.Job.filter({ 
    company_id, 
    is_deleted: false 
  });

  // Filter by date range
  const filteredJobs = jobs.filter(job => {
    const jobDate = new Date(job.created_date || job.inspection_date);
    return jobDate >= startDate;
  });

  // Load all estimates for these jobs
  const allEstimates = await base44.asServiceRole.entities.EstimateDraft.filter({ 
    company_id, 
    is_deleted: false 
  });

  const jobIds = filteredJobs.map(j => j.id);
  const estimates = allEstimates.filter(e => jobIds.includes(e.job_id));

  // Load supplements
  const supplements = await base44.asServiceRole.entities.Supplement.filter({ 
    company_id, 
    is_deleted: false 
  });
  const relevantSupplements = supplements.filter(s => jobIds.includes(s.job_id));

  // Load claim defenses for risk scores
  const defenses = await base44.asServiceRole.entities.ClaimDefense.filter({ 
    company_id, 
    is_deleted: false 
  });
  const relevantDefenses = defenses.filter(d => jobIds.includes(d.job_id));

  // 1. Average Job Value
  const approvedEstimates = estimates.filter(e => e.status === 'approved' || e.status === 'locked');
  const totalValue = approvedEstimates.reduce((sum, e) => sum + (e.total || 0), 0);
  const avgJobValue = approvedEstimates.length > 0 ? totalValue / approvedEstimates.length : 0;

  // 2. Approval Rate
  const submittedEstimates = estimates.filter(e => ['approved', 'rejected', 'locked'].includes(e.status));
  const approvedCount = estimates.filter(e => e.status === 'approved' || e.status === 'locked').length;
  const approvalRate = submittedEstimates.length > 0 ? (approvedCount / submittedEstimates.length) * 100 : 0;

  // 3. Supplement Success Rate
  const relevantSupps = relevantSupplements.filter(s => ['approved', 'rejected'].includes(s.status));
  const approvedSupps = relevantSupplements.filter(s => s.status === 'approved').length;
  const supplementSuccessRate = relevantSupps.length > 0 ? (approvedSupps / relevantSupps.length) * 100 : 0;

  // 4. Estimate Turnaround Time (average days from job creation to estimate approval)
  const turnaroundTimes = [];
  for (const estimate of approvedEstimates) {
    const job = jobs.find(j => j.id === estimate.job_id);
    if (job && estimate.approved_at && job.created_date) {
      const jobDate = new Date(job.created_date);
      const approvalDate = new Date(estimate.approved_at);
      const daysDiff = (approvalDate.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 0) turnaroundTimes.push(daysDiff);
    }
  }
  const avgTurnaroundTime = turnaroundTimes.length > 0 ? turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length : 0;

  // 5. Profit Trend (by week)
  const weeklyProfitData = [];
  const weeks = Math.min(days, 90);
  for (let i = 0; i < weeks / 7; i++) {
    const weekStart = new Date(now.getTime() - ((i + 1) * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
    
    const weekEstimates = approvedEstimates.filter(e => {
      const date = new Date(e.approved_at || e.created_date);
      return date >= weekStart && date <= weekEnd;
    });
    
    const weekTotal = weekEstimates.reduce((sum, e) => sum + (e.total || 0), 0);
    weeklyProfitData.unshift({
      week: `Week ${weeks / 7 - i}`,
      value: weekTotal,
      count: weekEstimates.length,
    });
  }

  // 6. Risk Score Trend (by week)
  const weeklyRiskData = [];
  for (let i = 0; i < weeks / 7; i++) {
    const weekStart = new Date(now.getTime() - ((i + 1) * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
    
    const weekDefenses = relevantDefenses.filter(d => {
      const date = new Date(d.created_at);
      return date >= weekStart && date <= weekEnd;
    });
    
    const avgRisk = weekDefenses.length > 0 
      ? weekDefenses.reduce((sum, d) => sum + (d.defense_score || 0), 0) / weekDefenses.length 
      : 0;
    
    weeklyRiskData.unshift({
      week: `Week ${weeks / 7 - i}`,
      risk_score: avgRisk,
      count: weekDefenses.length,
    });
  }

  // Trend calculations
  const currentWeekProfit = weeklyProfitData[weeklyProfitData.length - 1]?.value || 0;
  const previousWeekProfit = weeklyProfitData[weeklyProfitData.length - 2]?.value || 0;
  const profitTrend = previousWeekProfit > 0 ? ((currentWeekProfit - previousWeekProfit) / previousWeekProfit) * 100 : 0;

  const currentWeekRisk = weeklyRiskData[weeklyRiskData.length - 1]?.risk_score || 0;
  const previousWeekRisk = weeklyRiskData[weeklyRiskData.length - 2]?.risk_score || 0;
  const riskTrend = currentWeekRisk - previousWeekRisk;

  // Job status breakdown
  const statusBreakdown = {
    active: filteredJobs.filter(j => j.status === 'active' || j.status === 'in_progress').length,
    completed: filteredJobs.filter(j => j.status === 'completed').length,
    pending: filteredJobs.filter(j => j.status === 'pending' || !j.status).length,
  };

  return Response.json({
    time_range: timeRange,
    period: {
      start: startDate.toISOString(),
      end: now.toISOString(),
      days,
    },
    metrics: {
      avg_job_value: avgJobValue,
      approval_rate: approvalRate,
      supplement_success_rate: supplementSuccessRate,
      avg_turnaround_days: avgTurnaroundTime,
      profit_trend_percentage: profitTrend,
      risk_score_trend: riskTrend,
    },
    trends: {
      profit: weeklyProfitData,
      risk: weeklyRiskData,
    },
    breakdown: {
      job_status: statusBreakdown,
      total_jobs: filteredJobs.length,
      total_estimates: estimates.length,
      total_supplements: relevantSupplements.length,
    },
    generated_at: now.toISOString(),
    generated_by: user.email,
  });
});