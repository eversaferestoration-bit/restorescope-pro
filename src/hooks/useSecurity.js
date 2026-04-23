import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const SESSION_CONFIG = {
  MAX_AGE_MS: 8 * 60 * 60 * 1000, // 8 hours
  WARNING_BEFORE_EXPIRY_MS: 15 * 60 * 1000, // 15 minutes warning
  CHECK_INTERVAL_MS: 5 * 60 * 1000, // Check every 5 minutes
};

/**
 * Hook to manage session timeout and auto-logout.
 *
 * Uses a localStorage timestamp set at login time (not user.created_date,
 * which is the account creation date and would always be > 8 hours old).
 * The session clock resets on every successful auth initialization.
 */
export function useSessionTimeout() {
  const { user, logout } = useAuth();
  const warningShown = useRef(false);
  const sessionTimer = useRef(null);

  // Record session start time the first time we see an authenticated user
  useEffect(() => {
    if (!user) return;
    const key = 'base44_session_start';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, Date.now().toString());
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      try {
        const key = 'base44_session_start';
        const sessionStart = parseInt(localStorage.getItem(key) || '0', 10);
        if (!sessionStart) return; // No session start recorded — don't log out

        const sessionAge = Date.now() - sessionStart;
        const timeRemaining = SESSION_CONFIG.MAX_AGE_MS - sessionAge;

        if (sessionAge > SESSION_CONFIG.MAX_AGE_MS) {
          localStorage.removeItem(key);
          toast.error('Your session has expired. Please log in again.');
          logout();
          return;
        }

        if (timeRemaining < SESSION_CONFIG.WARNING_BEFORE_EXPIRY_MS && !warningShown.current) {
          warningShown.current = true;
          toast.warning('Your session will expire in 15 minutes. Please save your work.', {
            duration: 30000,
          });
        }

        if (timeRemaining > SESSION_CONFIG.WARNING_BEFORE_EXPIRY_MS) {
          warningShown.current = false;
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    };

    checkSession();
    sessionTimer.current = setInterval(checkSession, SESSION_CONFIG.CHECK_INTERVAL_MS);

    return () => {
      if (sessionTimer.current) clearInterval(sessionTimer.current);
    };
  }, [user, logout]);
}

/**
 * Hook to detect role changes and force logout.
 * Only runs on an interval — never on mount — to avoid ejecting
 * a user whose session is still initializing.
 */
export function useRoleIntegrity() {
  const { user, logout } = useAuth();
  const originalRole = useRef(null);

  // Capture role once we have a confirmed user
  useEffect(() => {
    if (user?.role) originalRole.current = user.role;
  }, [user?.role]);

  useEffect(() => {
    if (!user) return;

    const checkRoleIntegrity = async () => {
      try {
        const freshUser = await base44.auth.me();
        if (!freshUser) {
          // Server says no session — log out cleanly (no argument)
          logout();
          return;
        }
        // Role changed — force re-login for security
        if (originalRole.current && freshUser.role !== originalRole.current) {
          toast.warning('Your access permissions have changed. Please log in again.');
          logout();
        }
      } catch (error) {
        // Network error during check — do NOT log out, just log it
        console.warn('[useSecurity] Role integrity check failed (non-fatal):', error?.message);
      }
    };

    // Delay first check by 2 minutes — never fires on mount
    const interval = setInterval(checkRoleIntegrity, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]); // only re-register when user identity changes, not on every logout ref change
}

/**
 * Combined security hook - use this in AppLayout or main components
 */
export function useSecurity() {
  useSessionTimeout();
  useRoleIntegrity();
}