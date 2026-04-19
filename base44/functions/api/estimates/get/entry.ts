import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const rateLimitStore = new Map();
function checkRateLimit(apiKey) {
  const now = Date.now();
  const key = `rate:${apiKey}`;
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + 3600000 };
  if (now > record.resetAt) { record.count = 1; record.resetAt = now + 3600000; } else { record.count++; }
  rateLimitStore.set(key, record);
  return { allowed: record.count <= 100, remaining: Math.max(0, 100 - record.count), resetAt: record.resetAt };
}

async function authenticateApiKey(req, base44) {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  if (!apiKey) return { error: 'API key required', status: 401 };
  const apiKeys = await base44.asServiceRole.entities.ApiKey.filter({ key: apiKey, is_active: true, is_deleted: false });
  if (!apiKeys.length) return { error: 'Invalid API key', status: 401 };
  const apiKeyRecord = apiKeys[0];
  const rateLimit = checkRateLimit(apiKey);
  if (!rateLimit.allowed) return { error: 'Rate limit exceeded', status: 429, rateLimit };
  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) return { error: 'API key expired', status: 401 };
  if (apiKeyRecord.allowed_ips?.length > 0) {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!apiKeyRecord.allowed_ips.includes(clientIp)) return { error: 'IP not allowed', status: 403 };
  }
  return { apiKeyRecord, rateLimit };
}

async function logApiRequest(apiKeyRecord, req, status = 'success', statusCode = 200) {
  try {
    const url = new URL(req.url);
    await base44.asServiceRole.entities.AuditLog.create({
      company_id: apiKeyRecord.company_id, entity_type: 'ApiKey', entity_id: apiKeyRecord.id,
      action: `api_${status}`, actor_email: apiKeyRecord.name || 'api', actor_id: apiKeyRecord.id,
      description: `External API ${url.pathname} - ${statusCode}`,
      metadata: { method: req.method, path: url.pathname, status_code: statusCode, user_agent: req.headers.get('user-agent'), ip: req.headers.get('x-forwarded-for') },
    });
  } catch (e) { console.error('Failed to log API request:', e); }
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const base44 = createClientFromRequest(req);
  const auth = await authenticateApiKey(req, base44);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { apiKeyRecord, rateLimit } = auth;

  try {
    const url = new URL(req.url);
    const estimateId = url.pathname.split('/').pop();
    if (!estimateId) { await logApiRequest(apiKeyRecord, req, 'validation_error', 400); return Response.json({ error: 'estimate_id required' }, { status: 400 }); }

    const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({ id: estimateId, company_id: apiKeyRecord.company_id, is_deleted: false });
    if (!estimates.length) { await logApiRequest(apiKeyRecord, req, 'not_found', 404); return Response.json({ error: 'Estimate not found' }, { status: 404 }); }
    const estimate = estimates[0];

    await logApiRequest(apiKeyRecord, req, 'estimate_retrieved', 200);

    return Response.json({
      success: true,
      data: {
        id: estimate.id, job_id: estimate.job_id, version_number: estimate.version_number, label: estimate.label, status: estimate.status,
        pricing_profile_id: estimate.pricing_profile_id, subtotal: estimate.subtotal, modifier_total: estimate.modifier_total, total: estimate.total,
        applied_modifiers: estimate.applied_modifiers,
        line_items: estimate.line_items.map(item => ({
          scope_item_id: item.scope_item_id, room_id: item.room_id, room_name: item.room_name, category: item.category,
          description: item.description, unit: item.unit, quantity: item.quantity, unit_cost: item.unit_cost,
          line_total: item.line_total, override_reason: item.override_reason, source: item.source,
        })),
        notes: estimate.notes, created_date: estimate.created_date, updated_date: estimate.updated_date,
        approved_by: estimate.approved_by, approved_at: estimate.approved_at,
      },
      rateLimit: { remaining: rateLimit.remaining, resetAt: new Date(rateLimit.resetAt).toISOString() },
    });
  } catch (error) {
    await logApiRequest(apiKeyRecord, req, 'error', 500);
    return Response.json({ error: 'internal_error', message: error.message }, { status: 500 });
  }
});