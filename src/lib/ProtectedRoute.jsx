import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, authError, isAuthenticated, accountState, accountStateChecked } = useAuth();

  // Loading auth or checking account state
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

  // Auth error — not authenticated
  if (authError) {
    return <Navigate to="/login" replace />;
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Account incomplete — needs recovery
  if (accountState === 'incomplete') {
    return <Navigate to="/account-recovery" replace />;
  }

  // Setup required — needs onboarding
  if (accountState === 'setup_required') {
    return <Navigate to="/onboarding" replace />;
  }

  // Ready — allow access
  if (accountState === 'ready') {
    return children;
  }

  // Unknown state — redirect to login for safety
  return <Navigate to="/login" replace />;
}