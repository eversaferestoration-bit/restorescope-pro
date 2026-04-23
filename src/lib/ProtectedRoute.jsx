import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

/**
 * ProtectedRoute — pure synchronous guard.
 * All async resolution happens in AuthContext before this runs.
 *
 * Guard order (matches spec):
 *   1. authLoading  → show spinner (nothing rendered)
 *   2. !user        → redirect to login
 *   3. needsOnboarding → redirect to /onboarding
 *   4. otherwise    → render children
 */
export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, isAuthenticated, user, authError, needsOnboarding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isOnboarding = location.pathname === '/onboarding';

  useEffect(() => {
    if (isLoadingAuth) return;

    // Guard 2: not authenticated
    if (!isAuthenticated || !user) {
      base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      return;
    }

    // Guard 3: needs onboarding — but don't redirect if already there
    if (needsOnboarding && !isOnboarding) {
      navigate('/onboarding', { replace: true });
      return;
    }

    // Guard 4: fully set up user landing on /onboarding → send to dashboard
    if (!needsOnboarding && isOnboarding) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, user, needsOnboarding, location.pathname]);

  // --- Render decisions (synchronous, no async) ---

  // 1. Auth still loading
  if (isLoadingAuth) {
    return <AuthLoadingScreen />;
  }

  // 2. Not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // 3. Needs onboarding — allow /onboarding to render; block all other protected routes
  if (needsOnboarding && !isOnboarding) {
    return <AuthLoadingScreen />;
  }

  // 4. Good to go
  return children;
}

function AuthLoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    </div>
  );
}