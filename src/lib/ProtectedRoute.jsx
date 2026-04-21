import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { diagnoseAccountState, repairPartialAccount } from '@/lib/authRepair';

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

    // Already on onboarding — let it manage itself
    if (location.pathname === '/onboarding') {
      setChecked(true);
      return;
    }

    // Already checked for this user — skip
    if (checkedUserRef.current === user.id) return;

    console.log('[ProtectedRoute] Diagnosing account state for user:', user.id);

    diagnoseAccountState(user)
      .then(async ({ state }) => {
        console.log('[ProtectedRoute] Account state:', state);

        if (state === 'ok') {
          checkedUserRef.current = user.id;
          setChecked(true);
          return;
        }

        if (state === 'no_profile') {
          const { fixed } = await repairPartialAccount(user);
          if (fixed) {
            console.log('[ProtectedRoute] Auto-repaired profile — proceeding');
            checkedUserRef.current = user.id;
            setChecked(true);
          } else {
            navigate('/onboarding', { replace: true });
          }
          return;
        }

        if (state === 'no_company' || state === 'onboarding_incomplete') {
          navigate('/onboarding', { replace: true });
          return;
        }

        // Unknown state — fail open
        checkedUserRef.current = user.id;
        setChecked(true);
      })
      .catch((err) => {
        console.warn('[ProtectedRoute] Diagnosis failed (network?):', err?.message);
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