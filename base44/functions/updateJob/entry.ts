import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TECHNICIAN_READONLY_FIELDS = ['status', 'assigned_manager_id', 'assigned_estimator_id', 'complexity_level', 'access_difficulty'];
const MANAGER_ONLY_FIELDS = ['status', 'assigned_manager_id', 'assigned_estimator_id', 'complexity_level', 'access_difficulty', 'emergency_flag', 'after_hours_flag'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Strict authentication
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  const body = await req.json();
  const { job_id, updates } = body;
  if (!job_id || !updates) {
    return Response.json({ error: 'job_id and updates required' }, { status: 400 });
  }

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }
  const job = jobs[0];

  // Company isolation — enforce regardless of role (admin is NOT cross-tenant)
  const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id, is_deleted: false,
  });
  const userCompanyId = userProfiles[0]?.company_id;
  if (!userCompanyId || userCompanyId !== job.company_id) {
    return Response.json({ error: 'Forbidden', message: 'Access denied: resource belongs to a different company.' }, { status: 403 });
  }

  // Role-based field restrictions
  if (user.role === 'technician') {
    for (const field of TECHNICIAN_READONLY_FIELDS) {
      if (field in updates) {
        return Response.json({ error: 'Forbidden', message: `Technicians cannot update ${field}` }, { status: 403 });
      }
    }
  } else if (user.role === 'estimator') {
    // Estimators cannot change manager-only fields
    for (const field of MANAGER_ONLY_FIELDS) {
      if (field in updates) {
        return Response.json({ error: 'Forbidden', message: `Only managers can update ${field}` }, { status: 403 });
      }
    }
  }

  const updated = await base44.asServiceRole.entities.Job.update(job_id, updates);

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Job',
    entity_id: job_id,
    action: 'updated',
    actor_email: user.email,
    actor_id: user.id,
    description: `Job ${job.job_number || job_id} updated`,
    metadata: { changed_fields: Object.keys(updates) },
  });

  return Response.json({ job: updated });
});