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
    const { job_id, client_email, file_url, file_name, file_size, token } = body;

    if (!job_id || !client_email || !file_url || !token) {
      return Response.json({ success: false, message: 'Missing required parameters', code: 'MISSING_PARAMETERS' }, { status: 400 });
    }

    const auth = await verifyClientToken(token);
    if (!auth.valid || auth.email !== client_email) {
      return Response.json({ success: false, message: 'Invalid or expired session', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // Verify job exists
    const job = await base44.asServiceRole.entities.Job.get(job_id).catch(() => null);
    if (!job || job.is_deleted) {
      return Response.json({ success: false, message: 'Job not found', code: 'JOB_NOT_FOUND' }, { status: 404 });
    }

    // Verify the insured on the job matches the authenticated client
    const insureds = await base44.asServiceRole.entities.Insured.filter({
      id: job.insured_id,
      email: client_email,
      is_deleted: false,
    });
    if (insureds.length === 0) {
      return Response.json({ success: false, message: 'Unauthorized to access this job', code: 'UNAUTHORIZED' }, { status: 403 });
    }

    const document = await base44.asServiceRole.entities.ClientDocument.create({
      company_id: job.company_id,
      job_id,
      file_url,
      file_name,
      file_size,
      status: 'received',
      created_by: client_email,
    });

    return Response.json({ success: true, document });
  } catch (error) {
    console.error('[CREATE_DOCUMENT_ERROR]', error);
    return Response.json({ success: false, message: 'Failed to upload document. Please try again.', code: 'DOCUMENT_CREATE_ERROR' }, { status: 500 });
  }
});