import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

// Public paths that should never trigger a login redirect
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/client-login', '/client-portal'];

/**
 * ProtectedRoute — pure synchronous guard.
 * All async resolution (session, profile, retries) happens in AuthContext.
 *
 * Guard order:
 *   1. isLoadingAuth              → show spinner (never redirect)
 *   2. network_error              → show retry screen (NEVER redirect to login)
 *   3. !user, explicitly rejected → redirect to login once (deduped)
 *   4. needsOnboarding            → redirect to /onboarding (NEVER login)
 *   5. !needsOnboarding on /onboarding → redirect to /dashboard
 *   6. otherwise                  → render children
 */
export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, isAuthenticated, user, authError, needsOnboarding } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const redirecting = useRef(false); // prevent duplicate redirects

  const isOnboarding = location.pathname === '/onboarding';
  const isPublic     = PUBLIC_PATHS.includes(location.pathname);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (redirecting.current) return;

    // Network error — hold position, never redirect
    if (authError?.type === 'network_error') {
      console.log('[ProtectedRoute] ⚠️ Network error — holding position at:', location.pathname);
      return;
    }

    // Not authenticated — redirect to login once
    if (!isAuthenticated || !user) {
      if (!isPublic) {
        redirecting.current = true;
        console.log('[ProtectedRoute] 🔒 No valid session → redirectToLogin from:', location.pathname);
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      }
      return;
    }

    // Reset redirect lock now that we're authenticated
    redirecting.current = false;

    // Authenticated but needs onboarding — go to /onboarding (never login)
    if (needsOnboarding && !isOnboarding) {
      console.log('[ProtectedRoute] 🧭 needsOnboarding → /onboarding (from:', location.pathname + ')');
      navigate('/onboarding', { replace: true });
      return;
    }

    // Fully set up user on /onboarding → send to dashboard
    if (!needsOnboarding && isOnboarding) {
      console.log('[ProtectedRoute] ✅ Already onboarded → /dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, user, authError, needsOnboarding, location.pathname]);

  // ── Render decisions ──

  if (isLoadingAuth) {
    return <AuthLoadingScreen message="Verifying session…" />;
  }

  if (authError?.type === 'network_error') {
    return <NetworkErrorScreen />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

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