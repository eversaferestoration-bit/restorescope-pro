import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { job_ids, token } = body;

    if (!job_ids || job_ids.length === 0 || !token) {
      return Response.json(
        { error: 'Missing job IDs or token' },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Fetch approved estimates for each job
    const estimates = {};

    for (const jobId of job_ids) {
      const drafts = await base44.asServiceRole.entities.EstimateDraft.filter({
        job_id: jobId,
        status: 'approved',
        is_deleted: false,
      }, '-version_number');

      if (drafts.length > 0) {
        const draft = drafts[0]; // Latest approved version

        // Return sanitized estimate (no modifiers details, just final total)
        estimates[jobId] = {
          id: draft.id,
          status: draft.status,
          total: draft.total,
          subtotal: draft.subtotal,
          modifier_total: draft.modifier_total,
          approved_at: draft.approved_at,
          line_items: (draft.line_items || []).map((item) => ({
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_cost: item.unit_cost,
            line_total: item.line_total,
          })),
        };
      }
    }

    return Response.json({
      success: true,
      estimates,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: 'Failed to fetch estimates' },
      { status: 500 }
    );
  }
});