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
    const { job_id, client_email, token } = body;

    if (!job_id || !client_email || !token) {
      return Response.json({ success: false, message: 'Missing required parameters', code: 'MISSING_PARAMETERS' }, { status: 400 });
    }

    const auth = await verifyClientToken(token);
    if (!auth.valid || auth.email !== client_email) {
      return Response.json({ success: false, message: 'Invalid or expired session', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

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

    return Response.json({ success: true, documents: sanitized });
  } catch (error) {
    console.error('[GET_DOCUMENTS_ERROR]', error);
    return Response.json({ success: false, message: 'Failed to fetch documents. Please try again.', code: 'FETCH_ERROR' }, { status: 500 });
  }
});