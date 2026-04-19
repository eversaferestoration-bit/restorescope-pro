import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * DELETE /api/keys/:keyId
 * Revoke an API key
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

  const url = new URL(req.url);
  const keyId = url.pathname.split('/').pop();

  if (!keyId) {
    return Response.json({ error: 'key_id required' }, { status: 400 });
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

  // Load API key
  const apiKeys = await base44.asServiceRole.entities.ApiKey.filter({
    id: keyId,
    company_id,
    is_deleted: false,
  });

  if (!apiKeys.length) {
    return Response.json({ error: 'API key not found' }, { status: 404 });
  }

  const apiKey = apiKeys[0];

  // Soft delete (revoke)
  await base44.asServiceRole.entities.ApiKey.update(keyId, {
    is_active: false,
    is_deleted: true,
  });

  // Log revocation
  await base44.asServiceRole.entities.AuditLog.create({
    company_id,
    entity_type: 'ApiKey',
    entity_id: keyId,
    action: 'revoked',
    actor_email: user.email,
    actor_id: user.id,
    description: `API key revoked: ${apiKey.name}`,
    metadata: {
      name: apiKey.name,
    },
  });

  return Response.json({
    success: true,
    message: 'API key revoked successfully',
  });
});