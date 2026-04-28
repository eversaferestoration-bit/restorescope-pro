import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const emptyReport = {
    metrics: {
      total_records: {
        total: 0,
        jobs: 0,
        estimates: 0,
        photos: 0,
      },
    },
    usage: {
      jobs_created: 0,
      estimates_created: 0,
      photos_uploaded: 0,
      active_users: 0,
    },
    totals: {
      jobs: 0,
      estimates: 0,
      photos: 0,
      users: 0,
    },
  };

  try {
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = user.company_id;

    if (!companyId) {
      return Response.json(emptyReport);
    }

    const safeFilter = {
      company_id: companyId,
      is_deleted: false,
    };

    const [jobs, estimates, photos, users] = await Promise.all([
      base44.asServiceRole.entities.Job.filter(safeFilter).catch(() => []),
      base44.asServiceRole.entities.EstimateDraft.filter(safeFilter).catch(() => []),
      base44.asServiceRole.entities.Photo.filter(safeFilter).catch(() => []),
      base44.asServiceRole.entities.UserProfile.filter({ company_id: companyId }).catch(() => []),
    ]);

    const jobCount = Array.isArray(jobs) ? jobs.length : 0;
    const estimateCount = Array.isArray(estimates) ? estimates.length : 0;
    const photoCount = Array.isArray(photos) ? photos.length : 0;
    const userCount = Array.isArray(users) ? users.length : 0;

    return Response.json({
      metrics: {
        total_records: {
          total: jobCount + estimateCount + photoCount,
          jobs: jobCount,
          estimates: estimateCount,
          photos: photoCount,
        },
      },
      usage: {
        jobs_created: jobCount,
        estimates_created: estimateCount,
        photos_uploaded: photoCount,
        active_users: userCount,
      },
      totals: {
        jobs: jobCount,
        estimates: estimateCount,
        photos: photoCount,
        users: userCount,
      },
      company_id: companyId,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({
      ...emptyReport,
      warning: error?.message || 'Usage report fallback returned.',
    });
  }
});