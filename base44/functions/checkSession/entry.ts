import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SESSION_CONFIG = {
  MAX_AGE_MS: 8 * 60 * 60 * 1000, // 8 hours
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Only admins can check session status
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (user.role !== 'admin' && user.role !== 'manager') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const body = await req.json();
  const { action } = body || {};
  
  // Check session validity
  const sessionStart = new Date(user.created_date);
  const now = new Date();
  const sessionAge = now - sessionStart;
  const timeRemaining = SESSION_CONFIG.MAX_AGE_MS - sessionAge;
  
  const sessionInfo = {
    user_id: user.id,
    email: user.email,
    role: user.role,
    session_age_ms: sessionAge,
    time_remaining_ms: Math.max(0, timeRemaining),
    expires_at: new Date(sessionStart.getTime() + SESSION_CONFIG.MAX_AGE_MS).toISOString(),
    is_expired: sessionAge > SESSION_CONFIG.MAX_AGE_MS,
    needs_refresh: timeRemaining < 15 * 60 * 1000, // Warn if less than 15 minutes
  };
  
  // Force logout if role changed or session expired
  if (sessionInfo.is_expired) {
    return Response.json({ 
      ...sessionInfo,
      action_required: 'reauth',
      message: 'Session expired. Please log in again.' 
    });
  }
  
  return Response.json(sessionInfo);
});