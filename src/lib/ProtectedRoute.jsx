import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { diagnoseAccountState, repairMissingUserProfile } from '@/lib/authRepair';

const INCOMPLETE_STATUSES = [
  'account_created',
  'company_started',
  'company_completed',
  'role_selected',
  'pricing_profile_set',
  // NOTE: 'first_job_started' is intentionally excluded — once the user clicks
  // "Create my first job" they should be able to use the app freely.
];

export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const checkedUserRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setChecked(true);
      return;
    }

    if (location.pathname === '/onboarding') {
      setChecked(true);
      return;
    }

    // Already checked for this user — skip the fetch
    if (checkedUserRef.current === user.id) return;

    const runCheck = async () => {
      try {
        const { hasProfile, hasCompany, profile, company } = await diagnoseAccountState(user);

        if (hasProfile) {
          const status = profile.onboarding_status;
          if (INCOMPLETE_STATUSES.includes(status)) {
            console.log('[ProtectedRoute] Onboarding incomplete, redirecting. Status:', status);
            navigate('/onboarding', { replace: true });
            return;
          }
          // Profile exists and onboarding done
          checkedUserRef.current = user.id;
          setChecked(true);
          return;
        }

        // No UserProfile — try to repair if we have a company
        if (!hasProfile && hasCompany && company) {
          console.log('[ProtectedRoute] Missing UserProfile — attempting auto-repair');
          const repaired = await repairMissingUserProfile(user, company);
          if (repaired) {
            console.log('[ProtectedRoute] Repair successful, allowing access');
            checkedUserRef.current = user.id;
            setChecked(true);
            return;
          }
        }

        // No UserProfile and no company (or repair failed) → onboarding
        if (!hasCompany) {
          console.log('[ProtectedRoute] No company found, routing to onboarding');
          navigate('/onboarding', { replace: true });
          return;
        }

        // Fallback: allow through
        checkedUserRef.current = user.id;
        setChecked(true);
      } catch (e) {
        console.warn('[ProtectedRoute] Account check error (non-blocking):', e?.message);
        // Network error — don't block the user
        checkedUserRef.current = user.id;
        setChecked(true);
      }
    };

    runCheck();
  }, [isAuthenticated, user?.id, location.pathname]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings) {
      if (authError?.type === 'auth_required' || (!isAuthenticated && !authError)) {
        console.log('[ProtectedRoute] Not authenticated, redirecting to login');
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