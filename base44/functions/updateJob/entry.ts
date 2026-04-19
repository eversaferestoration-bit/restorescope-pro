import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TECHNICIAN_READONLY_FIELDS = ['status', 'assigned_manager_id', 'assigned_estimator_id', 'complexity_level'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { job_id, updates } = body;
  if (!job_id || !updates) return Response.json({ error: 'job_id and updates required' }, { status: 400 });

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  // Verify company membership
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: not a member of this company' }, { status: 403 });
  }

  // Technicians cannot change restricted fields
  if (user.role === 'technician') {
    for (const field of TECHNICIAN_READONLY_FIELDS) {
      if (field in updates) {
        return Response.json({ error: `Forbidden: technicians cannot update ${field}` }, { status: 403 });
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