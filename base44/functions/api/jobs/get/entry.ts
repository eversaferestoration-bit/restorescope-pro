import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const rateLimitStore = new Map();

function checkRateLimit(apiKey) {
  const now = Date.now();
  const key = `rate:${apiKey}`;
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + 3600000 };
  if (now > record.resetAt) { record.count = 1; record.resetAt = now + 3600000; } 
  else { record.count++; }
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
      company_id: apiKeyRecord.company_id,
      entity_type: 'ApiKey',
      entity_id: apiKeyRecord.id,
      action: `api_${status}`,
      actor_email: apiKeyRecord.name || 'api',
      actor_id: apiKeyRecord.id,
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
    const jobId = url.pathname.split('/').pop();
    if (!jobId) { await logApiRequest(apiKeyRecord, req, 'validation_error', 400); return Response.json({ error: 'job_id required' }, { status: 400 }); }

    const jobs = await base44.asServiceRole.entities.Job.filter({ id: jobId, company_id: apiKeyRecord.company_id, is_deleted: false });
    if (!jobs.length) { await logApiRequest(apiKeyRecord, req, 'not_found', 404); return Response.json({ error: 'Job not found' }, { status: 404 }); }
    const job = jobs[0];

    const [insured, property, claim] = await Promise.all([
      job.insured_id ? base44.asServiceRole.entities.Insured.filter({ id: job.insured_id, is_deleted: false }).then(r => r[0] || null) : null,
      job.property_id ? base44.asServiceRole.entities.Property.filter({ id: job.property_id, is_deleted: false }).then(r => r[0] || null) : null,
      job.claim_id ? base44.asServiceRole.entities.Claim.filter({ id: job.claim_id, is_deleted: false }).then(r => r[0] || null) : null,
    ]);

    await logApiRequest(apiKeyRecord, req, 'job_retrieved', 200);

    return Response.json({
      success: true,
      data: {
        id: job.id, job_number: job.job_number, status: job.status, loss_type: job.loss_type, service_type: job.service_type,
        cause_of_loss: job.cause_of_loss, inspection_date: job.inspection_date, date_of_loss: job.date_of_loss,
        emergency_flag: job.emergency_flag, after_hours_flag: job.after_hours_flag, complexity_level: job.complexity_level,
        access_difficulty: job.access_difficulty, assigned_manager_id: job.assigned_manager_id, assigned_estimator_id: job.assigned_estimator_id,
        summary_notes: job.summary_notes, created_date: job.created_date, updated_date: job.updated_date,
        insured: insured ? { id: insured.id, full_name: insured.full_name, phone: insured.phone, email: insured.email } : null,
        property: property ? { id: property.id, address: property.address, city: property.city, state: property.state, zip: property.zip } : null,
        claim: claim ? { id: claim.id, claim_number: claim.claim_number, policy_number: claim.policy_number, carrier_id: claim.carrier_id, adjuster_id: claim.adjuster_id } : null,
      },
      rateLimit: { remaining: rateLimit.remaining, resetAt: new Date(rateLimit.resetAt).toISOString() },
    });
  } catch (error) {
    await logApiRequest(apiKeyRecord, req, 'error', 500);
    return Response.json({ error: 'internal_error', message: error.message }, { status: 500 });
  }
});