import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = user.company_id;

    const filter = {
      company_id: companyId,
      is_deleted: false
    };

    const jobs = await base44.asServiceRole.entities.Job.filter(filter).catch(() => []);
    const photos = await base44.asServiceRole.entities.Photo.filter(filter).catch(() => []);
    const estimates = await base44.asServiceRole.entities.EstimateDraft.filter(filter).catch(() => []);
    const users = await base44.asServiceRole.entities.UserProfile.filter({ company_id: companyId }).catch(() => []);

    return Response.json({
      metrics: {
        total_records: {
          total: jobs.length + photos.length + estimates.length,
          jobs: jobs.length,
          estimates: estimates.length,
          photos: photos.length
        }
      }
    });

  } catch {
    return Response.json({
      metrics: {
        total_records: {
          total: 0,
          jobs: 0,
          estimates: 0,
          photos: 0
        }
      }
    });
  }
});