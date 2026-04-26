import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

function LoadingScreen({ message = 'Loading...' }) {
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
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
          ⚡
        </div>
        <div>
          <p className="font-semibold">Connection issue</p>
          <p className="text-sm text-muted-foreground mt-1">
            RestoreScope Pro could not reach the server. Retry before signing out or refreshing.
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const {
    isLoadingAuth,
    authChecked,
    isAuthenticated,
    user,
    authError,
    needsOnboarding,
    checkUserAuth,
  } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isLoadingAuth || !authChecked) return;
    if (authError?.type === 'network_error') return;
    if (isAuthenticated && user) return;

    const returnTo = `${location.pathname}${location.search}`;
    base44.auth.redirectToLogin(returnTo || '/dashboard');
  }, [isLoadingAuth, authChecked, isAuthenticated, user, authError, location.pathname, location.search]);

  if (isLoadingAuth || !authChecked) {
    return <LoadingScreen message="Verifying session..." />;
  }

  if (authError?.type === 'network_error') {
    return <NetworkErrorScreen onRetry={checkUserAuth} />;
  }

  if (!isAuthenticated || !user) {
    return <LoadingScreen message="Redirecting to sign in..." />;
  }

  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (!needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
