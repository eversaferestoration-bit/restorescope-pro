import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * POST /api/jobs
 * Create a new job via external API
 */

// Rate limiting store
const rateLimitStore = new Map();

const RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  maxRequests: 100,
};

function checkRateLimit(apiKey) {
  const now = Date.now();
  const key = `rate:${apiKey}`;
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + RATE_LIMIT.windowMs };

  if (now > record.resetAt) {
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

  const apiKeys = await base44.asServiceRole.entities.ApiKey.filter({
    key: apiKey,
    is_active: true,
    is_deleted: false,
  });

  if (!apiKeys.length) {
    return { error: 'Invalid API key', status: 401 };
  }

  const apiKeyRecord = apiKeys[0];

  const rateLimit = checkRateLimit(apiKey);
  if (!rateLimit.allowed) {
    return { error: 'Rate limit exceeded', status: 429, rateLimit };
  }

  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    return { error: 'API key expired', status: 401 };
  }

  if (apiKeyRecord.allowed_ips?.length > 0) {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!apiKeyRecord.allowed_ips.includes(clientIp)) {
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  
  const auth = await authenticateApiKey(req, base44);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { apiKeyRecord, rateLimit } = auth;

  try {
    const body = await req.json();
    const {
      job_number,
      insured_id,
      property_id,
      claim_id,
      loss_type,
      service_type,
      cause_of_loss,
      inspection_date,
      date_of_loss,
      emergency_flag = false,
      after_hours_flag = false,
      complexity_level = 'standard',
      access_difficulty = 'easy',
      assigned_manager_id,
      assigned_estimator_id,
      summary_notes,
    } = body;

    if (!loss_type || !service_type) {
      await logApiRequest(apiKeyRecord, req, 'validation_error', 400);
      return Response.json({ 
        error: 'validation_failed',
        message: 'loss_type and service_type are required',
      }, { status: 400 });
    }

    const VALID_COMPLEXITY = ['standard', 'complex', 'very_complex'];
    const VALID_ACCESS = ['easy', 'moderate', 'difficult'];
    
    if (complexity_level && !VALID_COMPLEXITY.includes(complexity_level)) {
      await logApiRequest(apiKeyRecord, req, 'validation_error', 400);
      return Response.json({ 
        error: 'invalid_complexity_level',
        valid_values: VALID_COMPLEXITY,
      }, { status: 400 });
    }

    if (access_difficulty && !VALID_ACCESS.includes(access_difficulty)) {
      await logApiRequest(apiKeyRecord, req, 'validation_error', 400);
      return Response.json({ 
        error: 'invalid_access_difficulty',
        valid_values: VALID_ACCESS,
      }, { status: 400 });
    }

    const job = await base44.asServiceRole.entities.Job.create({
      company_id: apiKeyRecord.company_id,
      job_number: job_number || null,
      insured_id: insured_id || null,
      property_id: property_id || null,
      claim_id: claim_id || null,
      loss_type,
      service_type,
      cause_of_loss: cause_of_loss || null,
      inspection_date: inspection_date || null,
      date_of_loss: date_of_loss || null,
      emergency_flag: !!emergency_flag,
      after_hours_flag: !!after_hours_flag,
      complexity_level,
      access_difficulty,
      assigned_manager_id: assigned_manager_id || null,
      assigned_estimator_id: assigned_estimator_id || null,
      summary_notes: summary_notes || null,
      status: 'new',
      created_by: apiKeyRecord.name || 'api',
      is_deleted: false,
    });

    await logApiRequest(apiKeyRecord, req, 'job_created', 201);

    return Response.json({
      success: true,
      data: {
        id: job.id,
        job_number: job.job_number,
        status: job.status,
        loss_type: job.loss_type,
        service_type: job.service_type,
        created_at: job.created_date,
      },
      rateLimit: {
        remaining: rateLimit.remaining,
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      },
    }, { status: 201 });

  } catch (error) {
    await logApiRequest(apiKeyRecord, req, 'error', 500);
    return Response.json({ 
      error: 'internal_error',
      message: error.message,
    }, { status: 500 });
  }
});