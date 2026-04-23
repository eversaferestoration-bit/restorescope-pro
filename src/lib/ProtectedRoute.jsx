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
];

// Module-level cache so the profile check survives route changes within the same session
let sessionCheckedUserId = null;

export default function ProtectedRoute({ children }) {
  const { isLoadingAuth, authError, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileChecked, setProfileChecked] = useState(() => {
    // If we already checked this user in a prior mount, skip immediately
    return !!(user && sessionCheckedUserId === user?.id);
  });

  useEffect(() => {
    // Wait until auth is resolved
    if (isLoadingAuth) return;

    // Not authenticated — redirect to login (only after auth is fully resolved)
    if (!isAuthenticated || !user) {
      if (authError?.type === 'auth_required' || !isAuthenticated) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      }
      return;
    }

    // Already on onboarding — skip profile check, let onboarding manage itself
    if (location.pathname === '/onboarding') {
      setProfileChecked(true);
      return;
    }

    // Already checked this user in this session — skip the DB round-trip
    if (sessionCheckedUserId === user.id) {
      setProfileChecked(true);
      return;
    }

    const email = normalizeEmail(user.email || '');
    console.log('[ProtectedRoute] Profile check for:', email);

    base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false }, '-created_date', 1)
      .then(async (profiles) => {
        if (profiles.length > 0) {
          const profile = profiles[0];
          if (INCOMPLETE_STATUSES.includes(profile.onboarding_status)) {
            console.log('[ProtectedRoute] Onboarding incomplete — routing');
            navigate('/onboarding', { replace: true });
            return;
          }
          // Verify company still exists
          if (profile.company_id) {
            const companies = await base44.entities.Company.filter(
              { id: profile.company_id, is_deleted: false }, '-created_date', 1
            ).catch(() => []);
            if (companies.length === 0) {
              navigate('/onboarding', { replace: true });
              return;
            }
          }
          sessionCheckedUserId = user.id;
          setProfileChecked(true);
          return;
        }

        // No profile — try to auto-repair via company lookup
        console.warn('[ProtectedRoute] No UserProfile — attempting repair for:', email);
        const companiesByEmail = await base44.entities.Company.filter(
          { created_by: email, is_deleted: false }, '-created_date', 1
        ).catch(() => []);

        if (companiesByEmail.length > 0) {
          const repaired = await repairMissingUserProfile(user, companiesByEmail[0]);
          if (repaired) {
            sessionCheckedUserId = user.id;
            setProfileChecked(true);
            return;
          }
        }

        navigate('/onboarding', { replace: true });
      })
      .catch((err) => {
        // Network error — fail open so the user isn't stuck
        console.warn('[ProtectedRoute] Profile check failed (network?):', err?.message);
        sessionCheckedUserId = user.id;
        setProfileChecked(true);
      });
  }, [isLoadingAuth, isAuthenticated, user?.id, location.pathname]);

  // Block rendering until the platform session is verified
  if (isLoadingAuth) {
    return <AuthLoadingScreen />;
  }

  // Auth resolved but not authenticated — return null (redirect is firing in useEffect)
  if (!isAuthenticated || !user) {
    return null;
  }

  // Authenticated but profile check not yet done (skip spinner on onboarding path)
  if (!profileChecked && location.pathname !== '/onboarding') {
    return <AuthLoadingScreen />;
  }

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