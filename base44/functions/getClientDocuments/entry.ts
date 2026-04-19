import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { job_id, client_email, token } = body;

    if (!job_id || !client_email || !token) {
      return Response.json(
        { error: 'Missing parameters' },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Fetch documents for job (created by this client email)
    const documents = await base44.asServiceRole.entities.ClientDocument.filter({
      job_id,
      created_by: client_email,
      is_deleted: false,
    }, '-created_date');

    const sanitized = documents.map((doc) => ({
      id: doc.id,
      file_name: doc.file_name,
      file_size: doc.file_size,
      status: doc.status,
      created_date: doc.created_date,
    }));

    return Response.json({
      success: true,
      documents: sanitized,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
});