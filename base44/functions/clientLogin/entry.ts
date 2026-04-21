import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SECRET = Deno.env.get('CLIENT_SESSION_SECRET');

async function signToken(insuredId, email) {
  const payload = `${insuredId}:${email}:${Date.now()}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  // token = base64(payload):signature
  return `${btoa(payload)}.${sigHex}`;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ success: false, message: 'Email and password are required', code: 'MISSING_CREDENTIALS' }, { status: 400 });
    }

    if (!SECRET) {
      console.error('[CLIENT_LOGIN] CLIENT_SESSION_SECRET not set');
      return Response.json({ success: false, message: 'Server configuration error', code: 'CONFIG_ERROR' }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);

    const insureds = await base44.asServiceRole.entities.Insured.filter({ email, is_deleted: false });

    if (insureds.length === 0) {
      return Response.json({ success: false, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    const insured = insureds[0];

    // Verify password — stored as SHA-256 hex hash on insured.password_hash
    if (!insured.password_hash) {
      return Response.json({ success: false, message: 'Account not configured for portal access', code: 'NO_PASSWORD' }, { status: 401 });
    }

    const pwHash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)))
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    if (pwHash !== insured.password_hash) {
      return Response.json({ success: false, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    const token = await signToken(insured.id, email);

    return Response.json({ success: true, token, insured_id: insured.id, email: insured.email });
  } catch (error) {
    console.error('[CLIENT_LOGIN_ERROR]', error);
    return Response.json({ success: false, message: 'Login failed. Please try again.', code: 'LOGIN_ERROR' }, { status: 500 });
  }
});