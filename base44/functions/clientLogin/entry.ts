import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import bcrypt from 'npm:bcryptjs@2.4.3';

// Token TTL: 24 hours
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
// Lock after 5 failed attempts for 15 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Sign a payload with HMAC-SHA256 using the CLIENT_SESSION_SECRET.
 * Returns a base64url-encoded string: base64url(json_payload) + '.' + base64url(signature)
 */
async function signToken(payload) {
  const secret = Deno.env.get('CLIENT_SESSION_SECRET');
  if (!secret) throw new Error('CLIENT_SESSION_SECRET not set');

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = btoa(payloadJson).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payloadB64));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${payloadB64}.${sigB64}`;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ success: false, message: 'Email and password are required', code: 'MISSING_CREDENTIALS' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const base44 = createClientFromRequest(req);

    const insureds = await base44.asServiceRole.entities.Insured.filter({
      email: normalizedEmail,
      is_deleted: false,
    });

    // Always take the same amount of time regardless of whether user exists (timing-safe)
    const insured = insureds[0] || null;

    // Check lockout BEFORE password verify
    if (insured?.portal_locked_until) {
      const lockedUntil = new Date(insured.portal_locked_until).getTime();
      if (Date.now() < lockedUntil) {
        const minutesLeft = Math.ceil((lockedUntil - Date.now()) / 60000);
        return Response.json({
          success: false,
          message: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
          code: 'ACCOUNT_LOCKED',
        }, { status: 429 });
      }
    }

    // If no password_hash, the account has no portal password set — deny with generic error
    const storedHash = insured?.password_hash || null;

    // Always run bcrypt compare even for non-existent users (use dummy hash) to prevent timing attacks
    const dummyHash = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    const hashToCompare = storedHash || dummyHash;
    const passwordValid = await bcrypt.compare(password, hashToCompare);

    if (!insured || !storedHash || !passwordValid) {
      // Increment failed attempt counter
      if (insured) {
        const attempts = (insured.portal_login_attempts || 0) + 1;
        const updateData = { portal_login_attempts: attempts };
        if (attempts >= MAX_ATTEMPTS) {
          updateData.portal_locked_until = new Date(Date.now() + LOCKOUT_MS).toISOString();
          console.warn(`[clientLogin] Account locked: ${normalizedEmail} after ${attempts} attempts`);
        }
        await base44.asServiceRole.entities.Insured.update(insured.id, updateData).catch(() => {});
      }

      return Response.json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      }, { status: 401 });
    }

    // Credentials valid — reset attempt counter and issue signed token
    await base44.asServiceRole.entities.Insured.update(insured.id, {
      portal_login_attempts: 0,
      portal_locked_until: null,
    }).catch(() => {});

    const tokenPayload = {
      sub: insured.id,
      email: insured.email,
      company_id: insured.company_id,
      iat: Date.now(),
      exp: Date.now() + TOKEN_TTL_MS,
    };

    const token = await signToken(tokenPayload);

    console.log(`[clientLogin] Successful login for ${normalizedEmail} | insured_id: ${insured.id}`);

    return Response.json({
      success: true,
      token,
      insured_id: insured.id,
      email: insured.email,
    });
  } catch (error) {
    console.error('[CLIENT_LOGIN_ERROR]', error.message);
    return Response.json({ success: false, message: 'Login failed. Please try again.', code: 'LOGIN_ERROR' }, { status: 500 });
  }
});