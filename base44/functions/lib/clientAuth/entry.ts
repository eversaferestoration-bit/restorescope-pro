/**
 * Shared HMAC-SHA256 token verification for client portal functions.
 * Token format: base64(insuredId:email:timestamp).hmacSigHex
 * Returns { valid, insuredId, email } or { valid: false }
 */
const SECRET = Deno.env.get('CLIENT_SESSION_SECRET');

// Token valid for 24 hours
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function verifyClientToken(token) {
  if (!token || !SECRET) return { valid: false };

  const dotIdx = token.lastIndexOf('.');
  if (dotIdx === -1) return { valid: false };

  const payloadB64 = token.slice(0, dotIdx);
  const sigHex = token.slice(dotIdx + 1);

  let payload;
  try {
    payload = atob(payloadB64);
  } catch {
    return { valid: false };
  }

  const parts = payload.split(':');
  if (parts.length < 3) return { valid: false };

  const [insuredId, email, tsStr] = parts;
  const ts = parseInt(tsStr, 10);

  if (isNaN(ts) || Date.now() - ts > TOKEN_TTL_MS) return { valid: false };

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (expectedHex !== sigHex) return { valid: false };

  return { valid: true, insuredId, email };
}