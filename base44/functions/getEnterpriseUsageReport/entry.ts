import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * GET /api/enterprise/usage-report
 * Generate comprehensive usage report for enterprise accounts
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = new URL(req.url);
  const companyId = url.searchParams.get('company_id');
  const locationId = url.searchParams.get('location_id');
  const days = parseInt(url.searchParams.get('days') || '30');

  if (!companyId) {
    return Response.json({ error: 'company_id required' }, { status: 400 });
  }

  // Get user's company for authorization
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id,
    is_deleted: false,
  });

  if (!profiles.length) {
    return Response.json({ error: 'User profile not found' }, { status: 404 });
  }

  const userCompanyId = profiles[0].company_id;
  
  // Admins can only access their own company data
  if (companyId !== userCompanyId) {
    return Response.json({ error: 'Access denied' }, { status: 403 });
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Load locations
  const locations = await base44.asServiceRole.entities.CompanyLocation.filter({
    company_id: companyId,
    is_deleted: false,
  });

  // Load jobs
  const jobs = await base44.asServiceRole.entities.Job.filter({
    company_id: companyId,
    is_deleted: false,
  });

  const filteredJobs = jobs.filter(job => {
    const jobDate = new Date(job.created_date);
    if (jobDate < startDate) return false;
    if (locationId && job.location_id !== locationId) return false;
    return true;
  });

  // Load estimates
  const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({
    company_id: companyId,
    is_deleted: false,
  });

  const relevantEstimates = estimates.filter(est => {
    const job = filteredJobs.find(j => j.id === est.job_id);
    return !!job;
  });

  // Load users
  const users = await base44.asServiceRole.entities.UserProfile.filter({
    company_id: companyId,
    is_deleted: false,
  });

  // Load photos
  const photos = await base44.asServiceRole.entities.Photo.filter({
    company_id: companyId,
    is_deleted: false,
  });

  const relevantPhotos = photos.filter(photo => {
    const job = filteredJobs.find(j => j.id === photo.job_id);
    return !!job;
  });

  // Calculate metrics by location
  const locationMetrics = locations.map(location => {
    const locationJobs = filteredJobs.filter(j => j.location_id === location.id || (!j.location_id && location.is_headquarters));
    const locationEstimates = relevantEstimates.filter(e => locationJobs.find(j => j.id === e.job_id));
    const locationPhotos = relevantPhotos.filter(p => locationJobs.find(j => j.id === p.job_id));
    const locationUsers = users.filter(u => u.location_id === location.id);

    const totalValue = locationEstimates
      .filter(e => e.status === 'approved' || e.status === 'locked')
      .reduce((sum, e) => sum + (e.total || 0), 0);

    return {
      location_id: location.id,
      location_name: location.name,
      location_code: location.code,
      is_headquarters: location.is_headquarters,
      jobs_count: locationJobs.length,
      estimates_count: locationEstimates.length,
      photos_count: locationPhotos.length,
      users_count: locationUsers.length,
      total_estimate_value: totalValue,
      avg_estimate_value: locationEstimates.length > 0 ? totalValue / locationEstimates.length : 0,
    };
  });

  // Overall metrics
  const totalValue = relevantEstimates
    .filter(e => e.status === 'approved' || e.status === 'locked')
    .reduce((sum, e) => sum + (e.total || 0), 0);

  const approvedEstimates = relevantEstimates.filter(e => e.status === 'approved' || e.status === 'locked');
  const approvalRate = relevantEstimates.length > 0 
    ? (approvedEstimates.length / relevantEstimates.length) * 100 
    : 0;

  // Daily trend
  const dailyMetrics = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const dayJobs = filteredJobs.filter(j => j.created_date?.startsWith(dateStr));
    const dayEstimates = relevantEstimates.filter(e => {
      const job = filteredJobs.find(j => j.id === e.job_id);
      return job && job.created_date?.startsWith(dateStr);
    });
    const dayValue = dayEstimates
      .filter(e => e.status === 'approved' || e.status === 'locked')
      .reduce((sum, e) => sum + (e.total || 0), 0);

    dailyMetrics.push({
      date: dateStr,
      jobs_created: dayJobs.length,
      estimates_created: dayEstimates.length,
      estimate_value: dayValue,
    });
  }

  return Response.json({
    success: true,
    data: {
      company_id: companyId,
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days,
      },
      summary: {
        total_locations: locations.length,
        total_jobs: filteredJobs.length,
        total_estimates: relevantEstimates.length,
        total_photos: relevantPhotos.length,
        total_users: users.length,
        total_estimate_value: totalValue,
        avg_estimate_value: relevantEstimates.length > 0 ? totalValue / relevantEstimates.length : 0,
        approval_rate: approvalRate,
      },
      by_location: locationMetrics,
      daily_trend: dailyMetrics,
      top_locations: locationMetrics
        .sort((a, b) => b.total_estimate_value - a.total_estimate_value)
        .slice(0, 5),
    },
    generated_at: new Date().toISOString(),
    generated_by: user.email,
  });
});