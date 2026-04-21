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
    const { client_email, token } = body;

    if (!client_email || !token) {
      return Response.json({ success: false, message: 'Email and token are required', code: 'MISSING_CREDENTIALS' }, { status: 400 });
    }

    const auth = await verifyClientToken(token);
    if (!auth.valid || auth.email !== client_email) {
      return Response.json({ success: false, message: 'Invalid or expired session', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    const insureds = await base44.asServiceRole.entities.Insured.filter({ email: client_email, is_deleted: false });
    if (insureds.length === 0) {
      return Response.json({ success: false, message: 'User not found', code: 'USER_NOT_FOUND' }, { status: 404 });
    }

    const insured = insureds[0];
    const jobs = await base44.asServiceRole.entities.Job.filter({ insured_id: insured.id, is_deleted: false }, '-created_date');

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

    return Response.json({ success: true, jobs: sanitized });
  } catch (error) {
    console.error('[GET_JOBS_ERROR]', error);
    return Response.json({ success: false, message: 'Failed to fetch jobs. Please try again.', code: 'FETCH_ERROR' }, { status: 500 });
  }
});