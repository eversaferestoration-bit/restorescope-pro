import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, full_name, company_name } = body;

    if (!email || !full_name || !company_name) {
      return Response.json(
        {
          success: false,
          message: 'Email, full name, and company name are required',
          code: 'MISSING_REQUIRED_FIELDS',
        },
        { status: 400 }
      );
    }

    // Step 1: User is already created by base44.auth.register() on frontend
    // Step 2: Get the current authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        {
          success: false,
          message: 'User authentication failed. Please try signing up again.',
          code: 'AUTH_FAILED',
        },
        { status: 401 }
      );
    }

    // Step 3: Create Company
    let company;
    try {
      company = await base44.asServiceRole.entities.Company.create({
        name: company_name,
        status: 'active',
        created_by: user.email,
        is_deleted: false,
      });
    } catch (error) {
      console.error('[CREATE_COMPANY_ERROR]', error);
      return Response.json(
        {
          success: false,
          message: 'Failed to create company. Please try signing up again.',
          code: 'COMPANY_CREATE_ERROR',
        },
        { status: 500 }
      );
    }

    // Step 4: Create UserProfile linking user to company
    let userProfile;
    try {
      userProfile = await base44.asServiceRole.entities.UserProfile.create({
        user_id: user.id,
        company_id: company.id,
        role: 'admin',
        is_deleted: false,
      });
    } catch (error) {
      console.error('[CREATE_PROFILE_ERROR]', error);
      
      // Rollback: Delete the company we just created
      try {
        await base44.asServiceRole.entities.Company.update(company.id, { is_deleted: true });
      } catch (rollbackError) {
        console.error('[ROLLBACK_COMPANY_ERROR]', rollbackError);
      }

      return Response.json(
        {
          success: false,
          message: 'Failed to link user to company. Please contact support.',
          code: 'PROFILE_CREATE_ERROR',
        },
        { status: 500 }
      );
    }

    // Log signup completion
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        company_id: company.id,
        entity_type: 'User',
        entity_id: user.id,
        action: 'created',
        actor_email: user.email,
        actor_id: user.id,
        description: `User account and company setup completed for ${user.full_name}`,
        metadata: {
          company_name,
          user_email: user.email,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditError) {
      console.warn('[AUDIT_LOG_ERROR]', auditError);
      // Don't fail the signup for audit log errors
    }

    return Response.json({
      success: true,
      user_id: user.id,
      company_id: company.id,
      message: 'Account setup completed successfully',
    });
  } catch (error) {
    console.error('[SIGNUP_ERROR]', error);
    return Response.json(
      {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
        code: 'SIGNUP_ERROR',
      },
      { status: 500 }
    );
  }
});