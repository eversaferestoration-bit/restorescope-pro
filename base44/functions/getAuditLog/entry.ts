import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Admin only - view security audit logs
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden', message: 'Admin access required' }, { status: 403 });
  }

  // Resolve company_id from user profile — never from request payload
  const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id, is_deleted: false,
  });
  if (!callerProfiles.length) {
    return Response.json({ error: 'No company profile found' }, { status: 403 });
  }
  const userCompanyId = callerProfiles[0].company_id;

  const body = await req.json();
  const { limit = 100, offset = 0, entity_type, action } = body || {};

  // Always scope to the caller's own company — admin cannot read other companies' logs
  const query = {
    company_id: userCompanyId,
    is_deleted: false,
  };
  
  if (entity_type) query.entity_type = entity_type;
  if (action) query.action = action;
  
  // Fetch audit logs
  const logs = await base44.asServiceRole.entities.AuditLog.filter(
    query,
    '-created_date',
    limit,
    offset
  );
  
  // Count by action type
  const actionCounts = {};
  const userActivity = {};
  
  logs.forEach((log) => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    userActivity[log.actor_email] = (userActivity[log.actor_email] || 0) + 1;
  });
  
  return Response.json({
    logs,
    summary: {
      total: logs.length,
      by_action: actionCounts,
      by_user: userActivity,
    },
  });
});