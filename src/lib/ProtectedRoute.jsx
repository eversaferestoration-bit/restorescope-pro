import { useAuth } from '@/lib/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Protects routes based on auth and account state.
 *
 * State transitions:
 *   not authenticated          → /login
 *   incomplete (no profile)    → /account-recovery
 *   setup_required (no company)→ /company-setup
 *   onboarding_incomplete      → /onboarding  (unless already there)
 *   ready                      → allow
 */
export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, authError, isAuthenticated, accountState, accountStateChecked } = useAuth();
  const { pathname } = useLocation();

  // Still loading
  if (isLoadingAuth || !accountStateChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (authError || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // No profile at all → recovery
  if (accountState === 'incomplete') {
    return <Navigate to="/account-recovery" replace />;
  }

  // Has profile but no company → company setup
  if (accountState === 'setup_required') {
    return <Navigate to="/company-setup" replace />;
  }

  // Has profile + company but onboarding not complete → onboarding
  if (accountState === 'onboarding_incomplete') {
    // Avoid redirect loop if somehow ProtectedRoute wraps onboarding itself
    if (pathname === '/onboarding') return children;
    return <Navigate to="/onboarding" replace />;
  }

  // Fully ready (or unknown transient state) → allow
  if (accountState === 'ready' || accountState === null) {
    return children;
  }

  // Unknown → recovery
  return <Navigate to="/account-recovery" replace />;
}