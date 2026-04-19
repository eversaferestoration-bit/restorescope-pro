import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * GET /api/enterprise/usage-report
 * Generate usage report for enterprise companies
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { period = 'weekly', location_id, days = 7 } = body;

  // Get user's company
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id,
    is_deleted: false,
  });

  if (!profiles.length) {
    return Response.json({ error: 'User profile not found' }, { status: 404 });
  }

  const company_id = profiles[0].company_id;

  // Calculate date range
  const now = new Date();
  const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

  // Load locations filter
  let locationFilter = {};
  if (location_id) {
    locationFilter = { location_id };
  }

  // Load jobs
  const jobs = await base44.asServiceRole.entities.Job.filter({
    company_id,
    is_deleted: false,
    ...locationFilter,
  });

  const filteredJobs = jobs.filter(job => {
    const jobDate = new Date(job.created_date);
    return jobDate >= startDate;
  });

  // Load estimates
  const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({
    company_id,
    is_deleted: false,
  });

  const jobIds = filteredJobs.map(j => j.id);
  const filteredEstimates = estimates.filter(e => 
    jobIds.includes(e.job_id) && 
    (e.status === 'approved' || e.status === 'locked')
  );

  // Load users
  const users = await base44.asServiceRole.entities.UserProfile.filter({
    company_id,
    is_deleted: false,
  });

  // Load photos
  const photos = await base44.asServiceRole.entities.Photo.filter({
    company_id,
    is_deleted: false,
    ...locationFilter,
  });

  const filteredPhotos = photos.filter(photo => {
    const photoDate = new Date(photo.created_date);
    return photoDate >= startDate;
  });

  // Calculate metrics
  const totalEstimateValue = filteredEstimates.reduce((sum, e) => sum + (e.total || 0), 0);
  const avgEstimateValue = filteredEstimates.length > 0 ? totalEstimateValue / filteredEstimates.length : 0;

  // Top users calculation
  const userStats = {};
  for (const job of filteredJobs) {
    const creator = job.created_by;
    if (!userStats[creator]) {
      userStats[creator] = { jobs_count: 0, estimates_count: 0 };
    }
    userStats[creator].jobs_count++;
  }

  for (const estimate of filteredEstimates) {
    const creator = estimate.created_by;
    if (userStats[creator]) {
      userStats[creator].estimates_count++;
    }
  }

  const topUsers = Object.entries(userStats)
    .map(([user_id, stats]) => {
      const userProfile = users.find(u => u.user_id === user_id);
      return {
        user_id,
        user_name: userProfile?.full_name || user_id,
        jobs_count: stats.jobs_count,
        estimates_count: stats.estimates_count,
      };
    })
    .sort((a, b) => b.jobs_count - a.jobs_count)
    .slice(0, 10);

  // Storage calculation (approximate)
  const storageUsedMB = filteredPhotos.reduce((sum, p) => sum + ((p.file_size || 0) / (1024 * 1024)), 0);

  // Create usage report
  const report = await base44.asServiceRole.entities.UsageReport.create({
    company_id,
    location_id: location_id || null,
    report_period: period,
    period_start: startDate.toISOString().split('T')[0],
    period_end: now.toISOString().split('T')[0],
    total_jobs: filteredJobs.length,
    total_estimates: filteredEstimates.length,
    total_users: users.length,
    total_photos: filteredPhotos.length,
    ai_analyses_count: filteredPhotos.filter(p => p.analysis_status === 'analysis_complete').length,
    storage_used_mb: Math.round(storageUsedMB * 100) / 100,
    api_calls_count: 0, // Would need API log tracking
    total_estimate_value: Math.round(totalEstimateValue * 100) / 100,
    avg_estimate_value: Math.round(avgEstimateValue * 100) / 100,
    top_users: topUsers,
    generated_at: now.toISOString(),
    is_deleted: false,
  });

  return Response.json({
    success: true,
    data: {
      report_id: report.id,
      period: {
        type: period,
        start: report.period_start,
        end: report.period_end,
        days,
      },
      location: location_id || 'all',
      metrics: {
        total_jobs: filteredJobs.length,
        total_estimates: filteredEstimates.length,
        total_users: users.length,
        total_photos: filteredPhotos.length,
        ai_analyses: report.ai_analyses_count,
        storage_mb: report.storage_used_mb,
        total_estimate_value: report.total_estimate_value,
        avg_estimate_value: report.avg_estimate_value,
      },
      top_users,
      generated_at: report.generated_at,
    },
  });
});