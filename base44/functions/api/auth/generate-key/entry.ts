import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * POST /api/auth/generate-key
 * Generate a new API key for the company
 * Admin/Manager only
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Authenticate user
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin/Manager only
  if (user.role !== 'admin' && user.role !== 'manager') {
    return Response.json({ error: 'Forbidden: Admin or Manager access required' }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    description,
    expires_at,
    allowed_ips,
    role_permissions,
    rate_limit_override,
  } = body;

  if (!name) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  // Get user's company
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id,
    is_deleted: false,
  });

  if (!profiles.length) {
    return Response.json({ error: 'User profile not found' }, { status: 404 });
  }

  const company_id = profiles[0].company_id;

  // Generate API key (secure random)
  const key = `sk_${crypto.randomUUID().replace(/-/g, '')}`;

  // Create API key
  const apiKey = await base44.asServiceRole.entities.ApiKey.create({
    company_id,
    name,
    key,
    description: description || null,
    is_active: true,
    expires_at: expires_at || null,
    allowed_ips: allowed_ips || [],
    role_permissions: role_permissions || ['admin', 'manager'],
    rate_limit_override: rate_limit_override || null,
    last_used_at: null,
    is_deleted: false,
  });

  // Log creation
  await base44.asServiceRole.entities.AuditLog.create({
    company_id,
    entity_type: 'ApiKey',
    entity_id: apiKey.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `API key created: ${name}`,
    metadata: {
      name,
      expires_at,
      allowed_ips_count: allowed_ips?.length || 0,
      role_permissions,
    },
  });

  return Response.json({
    success: true,
    data: {
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key, // Only shown once!
      description: apiKey.description,
      created_at: apiKey.created_date,
      expires_at: apiKey.expires_at,
      allowed_ips: apiKey.allowed_ips,
      role_permissions: apiKey.role_permissions,
    },
    warning: 'Save this API key securely. It will not be shown again.',
  }, { status: 201 });
});