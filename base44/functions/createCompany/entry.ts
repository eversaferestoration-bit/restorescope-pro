import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json(
        {
          success: false,
          message: 'You must be logged in to create a company',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }
    
    if (user.role !== 'admin') {
      return Response.json(
        {
          success: false,
          message: 'Only administrators can create companies',
          code: 'INSUFFICIENT_ROLE',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, legal_name, email, phone, address_line_1, city, state, zip, country, timezone } = body;

    if (!name) {
      return Response.json(
        {
          success: false,
          message: 'Company name is required',
          code: 'MISSING_COMPANY_NAME',
        },
        { status: 400 }
      );
    }

    const company = await base44.asServiceRole.entities.Company.create({
      name, legal_name, email, phone,
      address_line_1, city, state, zip, country, timezone,
      status: 'active',
      created_by: user.email,
      is_deleted: false,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      company_id: company.id,
      entity_type: 'Company',
      entity_id: company.id,
      action: 'created',
      actor_email: user.email,
      actor_id: user.id,
      description: `Company "${company.name}" created`,
      metadata: { name },
    });

    return Response.json({ success: true, company });
  } catch (error) {
    console.error('[CREATE_COMPANY_ERROR]', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to create company. Please try again.',
        code: 'COMPANY_CREATE_ERROR',
      },
      { status: 500 }
    );
  }
});