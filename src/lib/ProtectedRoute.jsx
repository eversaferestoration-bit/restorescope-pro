import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

/**
 * ProtectedRoute — pure synchronous guard.
 * All async resolution (session, profile, retries) happens in AuthContext.
 *
 * Guard order:
 *   1. isLoadingAuth        → show spinner
 *   2. network_error        → show retry screen (NEVER redirect to login)
 *   3. !user + auth_required → redirect to login (explicit session rejection only)
 *   4. !user (no error)     → redirect to login (no session at all)
 *   5. needsOnboarding      → redirect to /onboarding (NEVER login)
 *   6. !needsOnboarding on /onboarding → redirect to /dashboard
 *   7. otherwise            → render children
 */
export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, isAuthenticated, user, authError, needsOnboarding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isOnboarding = location.pathname === '/onboarding';

  useEffect(() => {
    if (isLoadingAuth) return;

    // Network error — do NOT redirect to login. AuthContext will surface the retry UI.
    if (authError?.type === 'network_error') {
      console.log('[ProtectedRoute] ⚠️ Network error — holding position, not redirecting to login');
      return;
    }

    // Not authenticated — only redirect to login on explicit session failure
    if (!isAuthenticated || !user) {
      console.log('[ProtectedRoute] 🔒 No session → redirecting to login from:', location.pathname);
      base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      return;
    }

    // Authenticated but needs onboarding — always /onboarding, never login
    if (needsOnboarding && !isOnboarding) {
      console.log('[ProtectedRoute] 🧭 needsOnboarding=true → redirecting to /onboarding from:', location.pathname);
      navigate('/onboarding', { replace: true });
      return;
    }

    // Fully set up user visiting /onboarding → send to dashboard
    if (!needsOnboarding && isOnboarding) {
      console.log('[ProtectedRoute] ✅ Already onboarded → redirecting to /dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, user, authError, needsOnboarding, location.pathname]);

  // --- Render decisions (synchronous) ---

  if (isLoadingAuth) {
    return <AuthLoadingScreen message="Verifying session…" />;
  }

  // Network error — show retry instead of blank screen or login redirect
  if (authError?.type === 'network_error') {
    return <NetworkErrorScreen />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Needs onboarding — allow /onboarding to render; hold spinner on other protected routes
  if (needsOnboarding && !isOnboarding) {
    return <AuthLoadingScreen message="Setting up your workspace…" />;
  }

  return children;
}

function AuthLoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}

function NetworkErrorScreen() {
  const { checkUserAuth } = useAuth();
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">⚡</div>
        <div>
          <p className="font-semibold text-foreground">Connection issue</p>
          <p className="text-sm text-muted-foreground mt-1">
            We couldn't reach the server. Your session may still be valid.
          </p>
        </div>
        <button
          onClick={() => checkUserAuth()}
          className="px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );
}