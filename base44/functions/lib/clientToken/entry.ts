/**
 * Shared client portal token utilities.
 * Tokens are HMAC-SHA256 signed: base64url(payload_json) + '.' + base64url(signature)
 * Payload: { sub, email, company_id, iat, exp }
 */

/**
 * Verify a client portal token.
 * Returns the decoded payload on success.
 * Throws a descriptive error string on failure.
 */
export async function verifyClientToken(token) {
  const secret = Deno.env.get('CLIENT_SESSION_SECRET');
  if (!secret) throw new Error('CLIENT_SESSION_SECRET not configured');

  const parts = (token || '').split('.');
  if (parts.length !== 2) throw new Error('INVALID_TOKEN');

  const [payloadB64, sigB64] = parts;

  // Re-derive signature and compare
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );

  // Restore base64 padding for atob
  const restorePad = (s) => s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((s.length + 2) % 4 || 4);

  let sigBytes;
  try {
    sigBytes = Uint8Array.from(atob(restorePad(sigB64)), (c) => c.charCodeAt(0));
  } catch {
    throw new Error('INVALID_TOKEN');
  }

  const valid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, encoder.encode(payloadB64));
  if (!valid) throw new Error('INVALID_TOKEN');

  // Decode payload
  let payload;
  try {
    payload = JSON.parse(atob(restorePad(payloadB64)));
  } catch {
    throw new Error('INVALID_TOKEN');
  }

  // Check expiry
  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error('TOKEN_EXPIRED');
  }

  if (!payload.sub || !payload.email) {
    throw new Error('INVALID_TOKEN');
  }

  return payload;
}