import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Returns usage stats for the calling user's company only.
 * Never returns data from other companies.
 *
 * Payload (optional):
 *   months: number  — how many recent months to return (default 6)
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const months = Math.min(Math.max(parseInt(body.months) || 6, 1), 24);

  // Resolve company_id from user's profile — never trust client-supplied company_id
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id,
    is_deleted: false,
  });

  if (!profiles.length) {
    return Response.json({ error: 'No company profile found' }, { status: 404 });
  }

  const company_id = profiles[0].company_id;
  if (!company_id) {
    return Response.json({ error: 'No company associated with this account' }, { status: 404 });
  }

  // Fetch this company's stats only
  const allStats = await base44.asServiceRole.entities.CompanyUsageStats.filter({
    company_id,
    is_deleted: false,
  }, '-cohort_month', months);

  // Aggregate lifetime totals
  const lifetime = allStats.reduce(
    (acc, s) => ({
      jobs_created: acc.jobs_created + (s.jobs_created || 0),
      estimates_generated: acc.estimates_generated + (s.estimates_generated || 0),
      photos_uploaded: acc.photos_uploaded + (s.photos_uploaded || 0),
    }),
    { jobs_created: 0, estimates_generated: 0, photos_uploaded: 0 }
  );

  // Find activation metrics (first job, first estimate, time-to-first-estimate)
  const activation = allStats.reduce(
    (acc, s) => ({
      first_job_created_at: acc.first_job_created_at || s.first_job_created_at || null,
      first_estimate_created_at: acc.first_estimate_created_at || s.first_estimate_created_at || null,
      time_to_first_estimate_hours: acc.time_to_first_estimate_hours ?? s.time_to_first_estimate_hours ?? null,
    }),
    { first_job_created_at: null, first_estimate_created_at: null, time_to_first_estimate_hours: null }
  );

  // Return monthly breakdown (sorted newest first) + lifetime + activation
  return Response.json({
    company_id,
    monthly: allStats.map(s => ({
      cohort_month: s.cohort_month,
      jobs_created: s.jobs_created || 0,
      estimates_generated: s.estimates_generated || 0,
      photos_uploaded: s.photos_uploaded || 0,
      last_job_at: s.last_job_at || null,
      last_estimate_at: s.last_estimate_at || null,
      last_photo_at: s.last_photo_at || null,
    })),
    lifetime,
    activation,
  });
});