import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

/**
 * ProtectedRoute — synchronous render-time guard.
 *
 * Decision tree (evaluated only after isLoadingAuth=false):
 *   1. isLoadingAuth          → show spinner (gate is still open)
 *   2. network_error          → show retry screen (never redirect)
 *   3. !isAuthenticated       → redirect to platform login
 *   4. needsOnboarding        → <Navigate to="/onboarding" />
 *   5. authenticated+onboarded on /onboarding → <Navigate to="/dashboard" />
 *   6. otherwise              → render children
 */
export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, isAuthenticated, user, authError, needsOnboarding, checkUserAuth } = useAuth();
  const location = useLocation();

  // Gate 1 — auth resolution not yet complete
  if (isLoadingAuth) {
    return <LoadingScreen message="Verifying session…" />;
  }

  // Gate 2 — network error (don't redirect — session may be valid)
  if (authError?.type === 'network_error') {
    return <NetworkErrorScreen onRetry={checkUserAuth} />;
  }

  // Gate 3 — no session → send to platform login
  if (!isAuthenticated || !user) {
    const returnTo = location.pathname + location.search;
    console.log('[ProtectedRoute] 🔒 No session → redirectToLogin, returnTo:', returnTo);
    base44.auth.redirectToLogin(returnTo);
    return <LoadingScreen message="Redirecting to sign in…" />;
  }

  // Gate 4 — authenticated but onboarding incomplete
  if (needsOnboarding && location.pathname !== '/onboarding') {
    console.log('[ProtectedRoute] 🧭 needsOnboarding → /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  // Gate 5 — onboarding already complete but sitting on /onboarding
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