import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { job_id, client_email, file_url, file_name, file_size, token } = body;

    if (!job_id || !client_email || !file_url || !token) {
      return Response.json(
        {
          success: false,
          message: 'Missing required parameters',
          code: 'MISSING_PARAMETERS',
        },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Verify job exists and insured matches
    const jobs = await base44.asServiceRole.entities.Job.filter({
      id: job_id,
      is_deleted: false,
    });

    if (jobs.length === 0) {
      return Response.json(
        {
          success: false,
          message: 'Job not found',
          code: 'JOB_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const job = jobs[0];

    // Verify insured email matches
    const insuleds = await base44.asServiceRole.entities.Insured.filter({
      id: job.insured_id,
      email: client_email,
      is_deleted: false,
    });

    if (insuleds.length === 0) {
      return Response.json(
        {
          success: false,
          message: 'Unauthorized to access this job',
          code: 'UNAUTHORIZED',
        },
        { status: 403 }
      );
    }

    // Get company ID from job
    const company_id = job.company_id;

    // Create document record
    const document = await base44.asServiceRole.entities.ClientDocument.create({
      company_id,
      job_id,
      file_url,
      file_name,
      file_size,
      status: 'received',
      created_by: client_email,
    });

    return Response.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('[CREATE_DOCUMENT_ERROR]', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to upload document. Please try again.',
        code: 'DOCUMENT_CREATE_ERROR',
      },
      { status: 500 }
    );
  }
});