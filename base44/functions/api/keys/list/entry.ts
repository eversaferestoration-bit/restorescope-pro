import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * GET /api/keys
 * List all API keys for the company
 * Admin only
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Authenticate user
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin only
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

  // Load API keys (hide actual key values for security)
  const apiKeys = await base44.asServiceRole.entities.ApiKey.filter({
    company_id,
    is_deleted: false,
  }, '-created_date');

  return Response.json({
    success: true,
    data: apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      description: key.description,
      is_active: key.is_active,
      created_at: key.created_date,
      expires_at: key.expires_at,
      last_used_at: key.last_used_at,
      allowed_ips: key.allowed_ips,
      role_permissions: key.role_permissions,
      key_preview: key.key ? `${key.key.slice(0, 8)}...` : null, // Show only first 8 chars
    })),
    total: apiKeys.length,
  });
});