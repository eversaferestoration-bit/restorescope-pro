import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings) {
      if (authError?.type === 'auth_required' || (!isAuthenticated && !authError)) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      }
    }
  }, [isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated]);

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </div>
    );
  }

  if (authError?.type === 'auth_required' || (!isAuthenticated && !authError)) {
    return null; // redirectToLogin is firing above
  }

  return children;
}