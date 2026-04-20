import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const INCOMPLETE_STATUSES = [
  'account_created',
  'company_started',
  'company_completed',
  'role_selected',
  'pricing_profile_set',
  'first_job_started',
];

export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || location.pathname === '/onboarding') {
      setChecked(true);
      return;
    }

    // Check onboarding status — redirect back if incomplete
    base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false }, '-created_date', 1)
      .then((profiles) => {
        if (profiles.length > 0) {
          const status = profiles[0].onboarding_status;
          if (INCOMPLETE_STATUSES.includes(status)) {
            navigate('/onboarding', { replace: true });
            return;
          }
          // Profile exists and onboarding is done — proceed
          setChecked(true);
          return;
        }

        // No UserProfile yet — check if company exists (legacy / first-time)
        return base44.entities.Company.filter({ is_deleted: false }, '-created_date', 1)
          .then((companies) => {
            if (companies.length === 0) {
              navigate('/onboarding', { replace: true });
            } else {
              setChecked(true);
            }
          });
      })
      .catch(() => setChecked(true)); // network error — don't block
  }, [isAuthenticated, user?.id, location.pathname]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings) {
      if (authError?.type === 'auth_required' || (!isAuthenticated && !authError)) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      }
    }
  }, [isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated]);

  if (isLoadingAuth || isLoadingPublicSettings || (isAuthenticated && !checked && location.pathname !== '/onboarding')) {
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