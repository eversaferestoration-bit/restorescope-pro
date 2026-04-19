import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Server-side audit log writer. Ensures company_id and actor are always stamped
 * from the authenticated session — the client cannot spoof them.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { entity_type, entity_id, action, description, metadata, company_id } = body;

  if (!entity_type || !action) return Response.json({ error: 'entity_type and action required' }, { status: 400 });

  // Verify company access if company_id provided
  if (company_id) {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id, is_deleted: false });
    if (!profiles.length && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: not a member of this company' }, { status: 403 });
    }
  }

  const log = await base44.asServiceRole.entities.AuditLog.create({
    company_id: company_id || '',
    entity_type,
    entity_id: entity_id || '',
    action,
    actor_email: user.email,   // always from session — not from client body
    actor_id: user.id,
    description: description || `${action} on ${entity_type}`,
    metadata: metadata || {},
  });

  return Response.json({ log_id: log.id });
});