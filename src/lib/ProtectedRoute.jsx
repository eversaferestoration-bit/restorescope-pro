import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

/**
 * ProtectedRoute — synchronous render-time guard.
 *
 * Decision tree (evaluated only after isLoadingAuth=false):
 *   1. isLoadingAuth=true        → spinner (never redirect)
 *   2. network_error             → retry screen (never redirect)
 *   3. !isAuthenticated          → useEffect fires redirectToLogin (render shows spinner)
 *   4. needsOnboarding           → <Navigate to="/onboarding" />
 *   5. onboarded on /onboarding  → <Navigate to="/dashboard" />
 *   6. otherwise                 → render children
 */
export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, isAuthenticated, user, authError, needsOnboarding, checkUserAuth } = useAuth();
  const location = useLocation();

  // Redirect to login in an effect (not during render) to avoid React render-phase side effects
  useEffect(() => {
    if (isLoadingAuth) return;
    if (authError?.type === 'network_error') return;
    if (!isAuthenticated || !user) {
      const returnTo = location.pathname + location.search;
      console.log('[ProtectedRoute] 🔒 No session → redirectToLogin | returnTo:', returnTo);
      base44.auth.redirectToLogin(returnTo);
    }
  }, [isLoadingAuth, isAuthenticated, user, authError, location.pathname]);

  // Gate 1 — still resolving
  if (isLoadingAuth) {
    return <LoadingScreen message="Verifying session…" />;
  }

  // Gate 2 — network error
  if (authError?.type === 'network_error') {
    return <NetworkErrorScreen onRetry={checkUserAuth} />;
  }

  // Gate 3 — no session (show spinner while effect fires redirect)
  if (!isAuthenticated || !user) {
    console.log('[ProtectedRoute] 🔒 No session — showing spinner while redirecting…');
    return <LoadingScreen message="Redirecting to sign in…" />;
  }

  // Gate 4 — authenticated but onboarding incomplete
  if (needsOnboarding && location.pathname !== '/onboarding') {
    console.log('[ProtectedRoute] 🧭 needsOnboarding → /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  // Gate 5 — already onboarded but on /onboarding
  if (!needsOnboarding && location.pathname === '/onboarding') {
    console.log('[ProtectedRoute] ✅ Onboarding complete → /dashboard');
    return <Navigate to="/dashboard" replace />;
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