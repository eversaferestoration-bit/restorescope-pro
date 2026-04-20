import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [companyChecked, setCompanyChecked] = useState(false);

  // Once authenticated, check if user has a company. If not, redirect to onboarding.
  useEffect(() => {
    if (!isAuthenticated || !user || location.pathname === '/onboarding') {
      setCompanyChecked(true);
      return;
    }

    base44.entities.Company.filter({ is_deleted: false }, '-created_date', 1)
      .then((companies) => {
        if (companies.length === 0) {
          navigate('/onboarding', { replace: true });
        }
      })
      .catch(() => {
        // If we can't check, just proceed — don't block the user
      })
      .finally(() => setCompanyChecked(true));
  }, [isAuthenticated, user?.id, location.pathname]);

  // Redirect unauthenticated users to hosted login
  useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings) {
      if (authError?.type === 'auth_required' || (!isAuthenticated && !authError)) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      }
    }
  }, [isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated]);

  if (isLoadingAuth || isLoadingPublicSettings || (isAuthenticated && !companyChecked && location.pathname !== '/onboarding')) {
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
    return null;
  }

  return children;
}