import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SECRET = Deno.env.get('CLIENT_SESSION_SECRET');
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

async function verifyClientToken(token) {
  if (!token || !SECRET) return { valid: false };
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx === -1) return { valid: false };
  const payloadB64 = token.slice(0, dotIdx);
  const sigHex = token.slice(dotIdx + 1);
  let payload;
  try { payload = atob(payloadB64); } catch { return { valid: false }; }
  const parts = payload.split(':');
  if (parts.length < 3) return { valid: false };
  const [insuredId, email, tsStr] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts) || Date.now() - ts > TOKEN_TTL_MS) return { valid: false };
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (expectedHex !== sigHex) return { valid: false };
  return { valid: true, insuredId, email };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { job_ids, client_email, token } = body;

    if (!job_ids || job_ids.length === 0 || !client_email || !token) {
      return Response.json({ success: false, message: 'Job IDs, email, and token are required', code: 'MISSING_PARAMETERS' }, { status: 400 });
    }

    const auth = await verifyClientToken(token);
    if (!auth.valid || auth.email !== client_email) {
      return Response.json({ success: false, message: 'Invalid or expired session', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    const estimates = {};
    for (const jobId of job_ids) {
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
    console.error('[GET_ESTIMATES_ERROR]', error);
    return Response.json({ success: false, message: 'Failed to fetch estimates. Please try again.', code: 'FETCH_ERROR' }, { status: 500 });
  }
});