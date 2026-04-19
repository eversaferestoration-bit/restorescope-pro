import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = ['admin', 'manager', 'estimator'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ALLOWED_ROLES.includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { company_id, job_number, loss_type, service_type, cause_of_loss, status,
    date_of_loss, inspection_date, emergency_flag, after_hours_flag,
    summary_notes, insured_id, property_id, claim_id,
    assigned_manager_id, assigned_estimator_id } = body;

  if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });
  if (!loss_type) return Response.json({ error: 'loss_type required' }, { status: 400 });
  if (!service_type) return Response.json({ error: 'service_type required' }, { status: 400 });

  // Verify company access
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: not a member of this company' }, { status: 403 });
  }

  const job = await base44.asServiceRole.entities.Job.create({
    company_id, job_number, loss_type, service_type, cause_of_loss,
    status: status || 'new', date_of_loss, inspection_date,
    emergency_flag: !!emergency_flag, after_hours_flag: !!after_hours_flag,
    summary_notes, insured_id, property_id, claim_id,
    assigned_manager_id, assigned_estimator_id,
    created_by: user.email,
    is_deleted: false,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    company_id,
    entity_type: 'Job',
    entity_id: job.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `Job ${job.job_number || job.id} created`,
    metadata: { loss_type, service_type, insured_id, property_id },
  });

  return Response.json({ job });
});