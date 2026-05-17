import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * calculateTeamMetrics
 * Returns team performance metrics for the calling user's company.
 * Admin/manager only.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return Response.json({ error: 'Forbidden: Manager or admin access required' }, { status: 403 });
    }

    // Resolve company from UserProfile — never trust request body
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      user_id: user.id,
      is_deleted: false,
    });

    if (!profiles.length) {
      return Response.json({ error: 'No company profile found' }, { status: 404 });
    }

    const company_id = profiles[0].company_id;

    // Fetch team members for this company
    const teamMembers = await base44.asServiceRole.entities.UserProfile.filter({
      company_id,
      is_deleted: false,
    });

    // Fetch jobs for this company
    const jobs = await base44.asServiceRole.entities.Job.filter({
      company_id,
      is_deleted: false,
    });

    // Fetch estimates for this company
    const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({
      company_id,
      is_deleted: false,
    });

    // Per-user job and estimate stats
    const memberStats = teamMembers.map((member) => {
      const memberJobs = jobs.filter((j) => j.created_by === member.email || j.assigned_estimator_id === member.user_id || j.assigned_manager_id === member.user_id);
      const memberEstimates = estimates.filter((e) => e.created_by === member.email);
      const approvedEstimates = memberEstimates.filter((e) => e.status === 'approved');

      return {
        user_id: member.user_id,
        email: member.email,
        full_name: member.full_name,
        role: member.role,
        jobs_count: memberJobs.length,
        estimates_created: memberEstimates.length,
        estimates_approved: approvedEstimates.length,
        approval_rate: memberEstimates.length > 0
          ? Math.round((approvedEstimates.length / memberEstimates.length) * 100)
          : 0,
        total_estimate_value: approvedEstimates.reduce((sum, e) => sum + (e.total || 0), 0),
      };
    });

    return Response.json({
      success: true,
      company_id,
      team_size: teamMembers.length,
      total_jobs: jobs.length,
      total_estimates: estimates.length,
      member_stats: memberStats,
      generated_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[calculateTeamMetrics] Error:', err.message);
    return Response.json({
      success: false,
      error: 'An internal error occurred. Please try again.',
    }, { status: 500 });
  }
});