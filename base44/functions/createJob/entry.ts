import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = ['admin', 'manager', 'estimator'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Strict authentication
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }
  
  // Role validation
  if (!ALLOWED_ROLES.includes(user.role)) {
    return Response.json({ error: 'Forbidden', message: 'Insufficient role to create jobs' }, { status: 403 });
  }

  const body = await req.json();
  const { company_id, job_number, loss_type, service_type, cause_of_loss, status,
    date_of_loss, inspection_date, emergency_flag, after_hours_flag,
    summary_notes, insured_id, property_id, claim_id,
    assigned_manager_id, assigned_estimator_id } = body;

  // Input validation
  if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });
  if (!loss_type) return Response.json({ error: 'loss_type required' }, { status: 400 });
  if (!service_type) return Response.json({ error: 'service_type required' }, { status: 400 });

  // Company isolation - verify access (admins have universal access)
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
      user_id: user.id, 
      company_id, 
      is_deleted: false 
    });
    if (!profiles.length) {
      return Response.json({ error: 'Forbidden', message: 'Access denied: You are not a member of this company.' }, { status: 403 });
    }
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

  // Audit logging
  await base44.asServiceRole.entities.AuditLog.create({
    company_id,
    entity_type: 'Job',
    entity_id: job.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `Job ${job.job_number || job.id} created`,
    metadata: { 
      loss_type, 
      service_type, 
      insured_id, 
      property_id,
      timestamp: new Date().toISOString(),
      user_role: user.role,
    },
  });

  return Response.json({ job });
});