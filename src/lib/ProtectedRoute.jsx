import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { normalizeEmail, repairMissingUserProfile } from '@/lib/authRepair';

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

    const email = normalizeEmail(user.email || '');
    console.log('[ProtectedRoute] Checking account state for:', email);

    base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false }, '-created_date', 1)
      .then(async (profiles) => {
        console.log('[ProtectedRoute] UserProfile exists:', profiles.length > 0);

        if (profiles.length > 0) {
          const profile = profiles[0];
          const status = profile.onboarding_status;
          if (INCOMPLETE_STATUSES.includes(status)) {
            navigate('/onboarding', { replace: true });
            return;
          }

          if (profile.company_id) {
            const companies = await base44.entities.Company.filter(
              { id: profile.company_id, is_deleted: false }, '-created_date', 1
            ).catch(() => []);
            console.log('[ProtectedRoute] Company exists:', companies.length > 0);
            if (companies.length === 0) {
              console.warn('[ProtectedRoute] Company missing for profile, routing to onboarding');
              navigate('/onboarding', { replace: true });
              return;
            }
          }

          checkedUserRef.current = user.id;
          setChecked(true);
          return;
        }

        // No UserProfile — try to find a company by created_by email to auto-repair
        console.warn('[ProtectedRoute] No UserProfile found — attempting repair');
        const companiesByEmail = await base44.entities.Company.filter(
          { created_by: email, is_deleted: false }, '-created_date', 1
        ).catch(() => []);
        console.log('[ProtectedRoute] Company by email exists:', companiesByEmail.length > 0);

        if (companiesByEmail.length > 0) {
          const repaired = await repairMissingUserProfile(user, companiesByEmail[0]);
          if (repaired) {
            console.log('[ProtectedRoute] UserProfile repaired — proceeding normally');
            checkedUserRef.current = user.id;
            setChecked(true);
            return;
          }
        }

        console.warn('[ProtectedRoute] No company found — routing to account recovery');
        navigate('/account-recovery', { replace: true });
      })
      .catch((err) => {
        console.warn('[ProtectedRoute] Account check failed (network?):', err?.message);
        checkedUserRef.current = user.id;
        setChecked(true);
      });
  }, [isAuthenticated, user?.id, location.pathname]);

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