import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * External API Layer - Secure endpoints for third-party integrations
 * 
 * Features:
 * - API key authentication per company
 * - Rate limiting (100 requests/hour per API key)
 * - Comprehensive audit logging
 * - Role-based access control
 * - No direct DB exposure (uses Base44 SDK)
 */

// Rate limiting store (in-memory for now, could use Redis)
const rateLimitStore = new Map();

const RATE_LIMIT = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100,
};

function checkRateLimit(apiKey) {
  const now = Date.now();
  const key = `rate:${apiKey}`;
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + RATE_LIMIT.windowMs };

  if (now > record.resetAt) {
    // Reset window
    record.count = 1;
    record.resetAt = now + RATE_LIMIT.windowMs;
  } else {
    record.count++;
  }

  rateLimitStore.set(key, record);

  return {
    allowed: record.count <= RATE_LIMIT.maxRequests,
    remaining: Math.max(0, RATE_LIMIT.maxRequests - record.count),
    resetAt: record.resetAt,
  };
}

async function authenticateApiKey(req, base44) {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');

  if (!apiKey) {
    return { error: 'API key required', status: 401 };
  }

  // Load API key entity
  const apiKeys = await base44.asServiceRole.entities.ApiKey.filter({
    key: apiKey,
    is_active: true,
    is_deleted: false,
  });

  if (!apiKeys.length) {
    return { error: 'Invalid API key', status: 401 };
  }

  const apiKeyRecord = apiKeys[0];

  // Check rate limit
  const rateLimit = checkRateLimit(apiKey);
  if (!rateLimit.allowed) {
    await logApiRequest(apiKeyRecord, req, 'rate_limited', 429);
    return { error: 'Rate limit exceeded', status: 429, rateLimit };
  }

  // Check expiration
  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    return { error: 'API key expired', status: 401 };
  }

  // Check IP whitelist (if configured)
  if (apiKeyRecord.allowed_ips?.length > 0) {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!apiKeyRecord.allowed_ips.includes(clientIp)) {
      await logApiRequest(apiKeyRecord, req, 'ip_blocked', 403);
      return { error: 'IP not allowed', status: 403 };
    }
  }

  return { apiKeyRecord, rateLimit };
}

async function logApiRequest(apiKeyRecord, req, status = 'success', statusCode = 200) {
  try {
    const url = new URL(req.url);
    await base44.asServiceRole.entities.AuditLog.create({
      company_id: apiKeyRecord.company_id,
      entity_type: 'ApiKey',
      entity_id: apiKeyRecord.id,
      action: `api_${status}`,
      actor_email: apiKeyRecord.name || 'api',
      actor_id: apiKeyRecord.id,
      description: `External API ${url.pathname} - ${statusCode}`,
      metadata: {
        method: req.method,
        path: url.pathname,
        status_code: statusCode,
        user_agent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for'),
      },
    });
  } catch (e) {
    console.error('Failed to log API request:', e);
  }
}

function json(data, status = 200, apiKeyRecord = null) {
  if (apiKeyRecord) {
    logApiRequest(apiKeyRecord, null, 'success', status);
  }
  return Response.json(data, { status });
}

// Export for use in endpoint functions
export { authenticateApiKey, logApiRequest, json };