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
    const { token } = body;

    if (!token) {
      return Response.json({ success: false, message: 'Token required', code: 'MISSING_TOKEN' }, { status: 401 });
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

    // Confirm insured still exists and is not deleted
    const insureds = await base44.asServiceRole.entities.Insured.filter({
      id: tokenPayload.sub,
      is_deleted: false,
    });
    if (!insureds.length) {
      return Response.json({ success: false, message: 'Account not found', code: 'INSURED_NOT_FOUND' }, { status: 404 });
    }

    const jobs = await base44.asServiceRole.entities.Job.filter({
      insured_id: tokenPayload.sub,
      is_deleted: false,
    }, '-created_date');

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
    console.error('[GET_JOBS_ERROR]', error.message);
    return Response.json({ success: false, message: 'Failed to fetch jobs.', code: 'FETCH_ERROR' }, { status: 500 });
  }
});