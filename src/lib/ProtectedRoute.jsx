import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

/**
 * ProtectedRoute
 *
 * By the time this renders, AuthenticatedApp has already guaranteed:
 *   - isLoadingAuth === false
 *   - authError !== 'user_not_registered'
 *
 * This guard only handles:
 *   1. Network error → show retry screen (never redirect)
 *   2. No valid session → call redirectToLogin once (deduped)
 *   3. Needs onboarding → navigate to /onboarding
 *   4. Already onboarded on /onboarding → navigate to /dashboard
 *   5. Otherwise → render children
 */
export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, isAuthenticated, user, authError, needsOnboarding, checkUserAuth } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const redirecting = useRef(false);

  const isOnboarding = location.pathname === '/onboarding';

  useEffect(() => {
    // Never act while loading — AuthenticatedApp holds the gate, but be defensive
    if (isLoadingAuth) return;
    // Don't double-fire
    if (redirecting.current) return;
    // Network error — hold position, let the retry screen handle it
    if (authError?.type === 'network_error') return;

    if (!isAuthenticated || !user) {
      redirecting.current = true;
      const returnTo = window.location.pathname + window.location.search;
      console.log('[ProtectedRoute] 🔒 No session → redirectToLogin, returnTo:', returnTo);
      base44.auth.redirectToLogin(returnTo);
      return;
    }

    // Authenticated — reset redirect lock
    redirecting.current = false;

    if (needsOnboarding && !isOnboarding) {
      console.log('[ProtectedRoute] 🧭 needsOnboarding → /onboarding');
      navigate('/onboarding', { replace: true });
      return;
    }

    if (!needsOnboarding && isOnboarding) {
      console.log('[ProtectedRoute] ✅ Onboarding complete → /dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, user, authError, needsOnboarding, location.pathname]);

  // ── Render ──

  // Still loading (defensive — should be blocked upstream)
  if (isLoadingAuth) {
    return <LoadingScreen message="Verifying session…" />;
  }

  // Network error — show retry, never redirect
  if (authError?.type === 'network_error') {
    return <NetworkErrorScreen onRetry={checkUserAuth} />;
  }

  // Not authenticated — render nothing while redirect fires
  if (!isAuthenticated || !user) {
    return null;
  }

  // Needs onboarding but not there yet — render nothing while navigate fires
  if (needsOnboarding && !isOnboarding) {
    return null;
  }

  return children;
}

function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}

function NetworkErrorScreen({ onRetry }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">⚡</div>
        <div>
          <p className="font-semibold">Connection issue</p>
          <p className="text-sm text-muted-foreground mt-1">
            We couldn't reach the server. Your session may still be valid.
          </p>
        </div>
        <button
          onClick={onRetry}
          className="px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );
}