import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeEmail, repairMissingUserProfile } from '@/lib/authRepair';

const AuthContext = createContext();

const INCOMPLETE_STATUSES = [
  'account_created',
  'company_started',
  'company_completed',
  'role_selected',
  'pricing_profile_set',
];

// Retry an async fn up to `attempts` times with exponential backoff
async function withRetry(fn, attempts = 3, delayMs = 400) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const status = e?.status || e?.response?.status;
      // Don't retry on explicit auth failures — they are final
      if (status === 401 || status === 403) throw e;
      console.warn(`[AuthContext] Attempt ${i + 1} failed:`, e?.message || e);
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    initialize();
  }, []);

  const initialize = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    console.log('[AuthContext] 🔄 Initializing auth…');

    try {
      // 1. Verify session — retry up to 3x on network errors
      const currentUser = await withRetry(() => base44.auth.me());
      console.log('[AuthContext] ✅ Session verified:', normalizeEmail(currentUser?.email || ''));
      setUser(currentUser);

      // 2. Load UserProfile — retry up to 2x
      await loadUserProfile(currentUser, 2);

    } catch (error) {
      const status = error?.status || error?.response?.status;
      const reason = error?.data?.extra_data?.reason || error?.response?.data?.extra_data?.reason;
      console.error('[AuthContext] ❌ Auth init failed | status:', status, '| reason:', reason || error?.message);

      setUser(null);
      setUserProfile(null);

      if (reason === 'user_not_registered') {
        console.log('[AuthContext] → Setting error: user_not_registered');
        setAuthError({ type: 'user_not_registered' });
      } else if (status === 401 || status === 403) {
        // Only set auth_required for explicit session rejections
        console.log('[AuthContext] → Setting error: auth_required (explicit 401/403)');
        setAuthError({ type: 'auth_required' });
      } else {
        // Network blip or unknown error — don't redirect to login, show retry UI
        console.warn('[AuthContext] → Network/unknown error, NOT redirecting to login');
        setAuthError({ type: 'network_error', message: error?.message });
      }
    } finally {
      setIsLoadingAuth(false);
      console.log('[AuthContext] 🏁 Auth initialization complete');
    }
  };

  const loadUserProfile = async (currentUser, retries = 1) => {
    const email = normalizeEmail(currentUser?.email || '');
    console.log('[AuthContext] 🔍 Loading UserProfile for:', email);

    const doLoad = async () => {
      const profiles = await base44.entities.UserProfile.filter(
        { user_id: currentUser.id, is_deleted: false }, '-created_date', 1
      );

      if (profiles.length > 0) {
        console.log('[AuthContext] ✅ UserProfile loaded | status:', profiles[0].onboarding_status, '| company_id:', profiles[0].company_id);
        setUserProfile(profiles[0]);
        return profiles[0];
      }

      // No profile — attempt auto-repair via company lookup
      console.warn('[AuthContext] ⚠️ No UserProfile found — attempting repair for:', email);
      const companiesByEmail = await base44.entities.Company.filter(
        { created_by: email, is_deleted: false }, '-created_date', 1
      ).catch((e) => {
        console.warn('[AuthContext] Company lookup failed during repair:', e?.message);
        return [];
      });

      if (companiesByEmail.length > 0) {
        console.log('[AuthContext] 🔧 Found orphaned company, repairing profile…');
        const repaired = await repairMissingUserProfile(currentUser, companiesByEmail[0]);
        if (repaired) {
          console.log('[AuthContext] ✅ Profile repair successful → onboarding_completed');
          setUserProfile(repaired);
          return repaired;
        }
      }

      // No profile, no repairable company → needs onboarding
      console.log('[AuthContext] ℹ️ No profile & no company → user needs onboarding');
      setUserProfile(null);
      return null;
    };

    try {
      return await withRetry(doLoad, retries);
    } catch (e) {
      console.warn('[AuthContext] ⚠️ Profile load failed after retries — failing open (→ onboarding):', e?.message);
      setUserProfile(null);
      return null;
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    console.log('[AuthContext] 🔄 Refreshing UserProfile…');
    return loadUserProfile(user, 2);
  };

  // Optimistically mark onboarding complete — avoids round-trip race with ProtectedRoute
  const markOnboardingComplete = () => {
    console.log('[AuthContext] ✅ markOnboardingComplete() — flipping needsOnboarding to false');
    setUserProfile((prev) =>
      prev ? { ...prev, onboarding_status: 'onboarding_completed' } : prev
    );
  };

  const logout = () => {
    console.log('[AuthContext] 🚪 Logging out…');
    setUser(null);
    setUserProfile(null);
    setAuthError(null);
    base44.auth.logout('/');
  };

  // Derived flags
  const isAuthenticated = !!user;
  const needsOnboarding = isAuthenticated && (
    !userProfile ||
    INCOMPLETE_STATUSES.includes(userProfile?.onboarding_status)
  );

  console.log('[AuthContext] 📊 State snapshot | authenticated:', isAuthenticated, '| needsOnboarding:', needsOnboarding, '| loading:', isLoadingAuth, '| error:', authError?.type || 'none');

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      needsOnboarding,
      logout,
      checkUserAuth: initialize,
      refreshUserProfile,
      markOnboardingComplete,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};