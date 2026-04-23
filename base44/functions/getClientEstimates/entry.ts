import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function verifyClientToken(token) {
  const secret = Deno.env.get('CLIENT_SESSION_SECRET');
  if (!secret) throw new Error('CLIENT_SESSION_SECRET not configured');
  const parts = (token || '').split('.');
  if (parts.length !== 2) throw new Error('INVALID_TOKEN');
  const [payloadB64, sigB64] = parts;
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const restorePad = (s) => s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((s.length + 2) % 4 || 4);
  const sigBytes = Uint8Array.from(atob(restorePad(sigB64)), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, encoder.encode(payloadB64));
  if (!valid) throw new Error('INVALID_TOKEN');
  const payload = JSON.parse(atob(restorePad(payloadB64)));
  if (!payload.exp || Date.now() > payload.exp) throw new Error('TOKEN_EXPIRED');
  if (!payload.sub || !payload.email) throw new Error('INVALID_TOKEN');
  return payload;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { job_ids, token } = body;

    if (!token) {
      return Response.json({ success: false, message: 'Token required', code: 'MISSING_TOKEN' }, { status: 401 });
    }

    if (!job_ids || job_ids.length === 0) {
      return Response.json({ success: false, message: 'Job IDs required', code: 'MISSING_PARAMETERS' }, { status: 400 });
    }

    let tokenPayload;
    try {
      tokenPayload = await verifyClientToken(token);
    } catch (e) {
      const expired = e.message === 'TOKEN_EXPIRED';
      return Response.json({
        success: false,
        message: expired ? 'Session expired. Please log in again.' : 'Invalid session. Please log in again.',
        code: expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // Verify the requested jobs actually belong to this insured (prevents horizontal escalation)
    const insuredJobs = await base44.asServiceRole.entities.Job.filter({
      insured_id: tokenPayload.sub,
      is_deleted: false,
    }, '-created_date');
    const allowedJobIds = new Set(insuredJobs.map((j) => j.id));

    const estimates = {};
    for (const jobId of job_ids) {
      // Skip any job ID the insured doesn't own
      if (!allowedJobIds.has(jobId)) continue;

      const drafts = await base44.asServiceRole.entities.EstimateDraft.filter({
        job_id: jobId,
        status: 'approved',
        is_deleted: false,
      }, '-version_number');

      if (drafts.length > 0) {
        const draft = drafts[0];
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

    return Response.json({ success: true, estimates });
  } catch (error) {
    console.error('[GET_ESTIMATES_ERROR]', error.message);
    return Response.json({ success: false, message: 'Failed to fetch estimates.', code: 'FETCH_ERROR' }, { status: 500 });
  }
});