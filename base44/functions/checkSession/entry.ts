import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_WARN_MS    = 15 * 60 * 1000;      // warn when < 15 min remain

/**
 * checkSession
 *
 * Returns the live session state for the calling user.
 *
 * Session age is derived from the `session_issued_at` timestamp that the
 * frontend writes to the request body (sourced from `base44_session_start`
 * in localStorage, which is set by AuthContext on every successful me() call).
 *
 * If the caller does not supply `session_issued_at` — or the value cannot be
 * parsed — we treat the session as fresh (no false expiry).
 *
 * We intentionally NEVER use `user.created_date` as a session timestamp.
 * That field holds the account creation date, which would immediately expire
 * every account older than MAX_AGE_MS.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { success: false, message: 'You must be logged in to check session', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return Response.json(
        { success: false, message: 'Manager or admin access required', code: 'INSUFFICIENT_ROLE' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // The frontend passes this from localStorage('base44_session_start'),
    // which is set by AuthContext after every successful me() call.
    // It is a Unix timestamp (ms) as a string or number.
    const rawIssuedAt = body.session_issued_at;
    const parsedIssuedAt = rawIssuedAt ? parseInt(String(rawIssuedAt), 10) : NaN;
    const sessionStart = !isNaN(parsedIssuedAt) && parsedIssuedAt > 0
      ? new Date(parsedIssuedAt)
      : null;

    const now = new Date();

    // If no valid session start supplied, report as active with unknown age.
    // Never force-expire based on missing data.
    if (!sessionStart) {
      return Response.json({
        success: true,
        user_id: user.id,
        email: user.email,
        role: user.role,
        session_age_ms: null,
        time_remaining_ms: null,
        expires_at: null,
        is_expired: false,
        needs_refresh: false,
        note: 'No session_issued_at provided — session treated as active.',
      });
    }

    const sessionAge    = now.getTime() - sessionStart.getTime();
    const timeRemaining = SESSION_MAX_AGE_MS - sessionAge;
    const isExpired     = sessionAge > SESSION_MAX_AGE_MS;
    const needsRefresh  = !isExpired && timeRemaining < SESSION_WARN_MS;

    const sessionInfo = {
      success: true,
      user_id: user.id,
      email: user.email,
      role: user.role,
      session_age_ms: sessionAge,
      time_remaining_ms: Math.max(0, timeRemaining),
      expires_at: new Date(sessionStart.getTime() + SESSION_MAX_AGE_MS).toISOString(),
      is_expired: isExpired,
      needs_refresh: needsRefresh,
    };

    if (isExpired) {
      return Response.json({
        ...sessionInfo,
        action_required: 'reauth',
        message: 'Session expired. Please log in again.',
        code: 'SESSION_EXPIRED',
      });
    }

    return Response.json(sessionInfo);

  } catch (error) {
    console.error('[CHECK_SESSION_ERROR]', error);
    return Response.json(
      { success: false, message: 'Failed to check session.', code: 'SESSION_CHECK_ERROR' },
      { status: 500 }
    );
  }
});