import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = ['admin', 'manager', 'estimator'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Strict authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        {
          success: false,
          message: 'You must be logged in to create jobs',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }
    
    // Role validation
    if (!ALLOWED_ROLES.includes(user.role)) {
      return Response.json(
        {
          success: false,
          message: 'Your role does not have permission to create jobs',
          code: 'INSUFFICIENT_ROLE',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { company_id, job_number, loss_type, service_type, cause_of_loss, status,
      date_of_loss, inspection_date, emergency_flag, after_hours_flag,
      summary_notes, insured_id, property_id, claim_id,
      assigned_manager_id, assigned_estimator_id } = body;

    // Input validation
    if (!company_id) {
      return Response.json(
        {
          success: false,
          message: 'Company ID is required',
          code: 'MISSING_COMPANY_ID',
        },
        { status: 400 }
      );
    }
    if (!loss_type) {
      return Response.json(
        {
          success: false,
          message: 'Loss type is required',
          code: 'MISSING_LOSS_TYPE',
        },
        { status: 400 }
      );
    }
    if (!service_type) {
      return Response.json(
        {
          success: false,
          message: 'Service type is required',
          code: 'MISSING_SERVICE_TYPE',
        },
        { status: 400 }
      );
    }

    // Company isolation — enforce regardless of role (admin is NOT cross-tenant)
    const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({
      user_id: user.id, is_deleted: false,
    });
    const userCompanyId = userProfiles[0]?.company_id;
    if (!userCompanyId || userCompanyId !== company_id) {
      return Response.json(
        {
          success: false,
          message: 'Access denied: You do not belong to this company.',
          code: 'ACCESS_DENIED',
        },
        { status: 403 }
      );
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

    return Response.json({ success: true, job });
  } catch (error) {
    console.error('[CREATE_JOB_ERROR]', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to create job. Please try again.',
        code: 'JOB_CREATE_ERROR',
      },
      { status: 500 }
    );
  }
});