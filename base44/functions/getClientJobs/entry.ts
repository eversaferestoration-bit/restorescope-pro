import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { client_email, token } = body;

    if (!client_email || !token) {
      return Response.json(
        {
          success: false,
          message: 'Email and token are required',
          code: 'MISSING_CREDENTIALS',
        },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Find insured by email
    const insuleds = await base44.asServiceRole.entities.Insured.filter({
      email: client_email,
      is_deleted: false,
    });

    if (insuleds.length === 0) {
      return Response.json(
        {
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const insured = insuleds[0];

    // Fetch jobs for this insured
    const jobs = await base44.asServiceRole.entities.Job.filter({
      insured_id: insured.id,
      is_deleted: false,
    }, '-created_date');

    // Return sanitized job data (no internal notes, pricing, audit logs)
    const sanitized = jobs.map((job) => ({
      id: job.id,
      job_number: job.job_number,
      status: job.status,
      loss_type: job.loss_type,
      service_type: job.service_type,
      date_of_loss: job.date_of_loss,
      claim_number: job.claim_number,
      property_address: job.property_address,
      emergency_flag: job.emergency_flag,
      created_date: job.created_date,
    }));

    return Response.json({
      success: true,
      jobs: sanitized,
    });
  } catch (error) {
    console.error('[GET_JOBS_ERROR]', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to fetch jobs. Please try again.',
        code: 'FETCH_ERROR',
      },
      { status: 500 }
    );
  }
});