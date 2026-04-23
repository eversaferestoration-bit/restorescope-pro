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

// Retry an async fn up to `attempts` times with exponential backoff.
// Never retries on 401/403 — those are definitive auth rejections.
async function withRetry(fn, attempts = 3, delayMs = 300) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const status = e?.status || e?.response?.status;
      if (status === 401 || status === 403) throw e;
      console.warn(`[AuthContext] Attempt ${i + 1}/${attempts} failed:`, e?.message || e);
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

// Detect if the current URL contains a fresh access_token (just returned from login)
function hasFreshTokenInUrl() {
  return new URLSearchParams(window.location.search).has('access_token');
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError]     = useState(null);
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

    // If a fresh token just landed in the URL, give app-params.js a tick
    // to store it in localStorage before the SDK reads it.
    if (hasFreshTokenInUrl()) {
      console.log('[AuthContext] 🪙 Fresh access_token detected in URL — waiting for storage…');
      await new Promise(r => setTimeout(r, 50));
    }

    try {
      const currentUser = await withRetry(() => base44.auth.me(), 3, 300);
      console.log('[AuthContext] ✅ Session verified:', normalizeEmail(currentUser?.email || ''), '| id:', currentUser?.id);
      // Reset session start clock on every successful auth (login or page reload)
      localStorage.setItem('base44_session_start', Date.now().toString());
      setUser(currentUser);
      await loadUserProfile(currentUser, 2);

    } catch (error) {
      const status  = error?.status || error?.response?.status;
      const reason  = error?.data?.extra_data?.reason || error?.response?.data?.extra_data?.reason;
      const message = error?.message || String(error);
      console.error('[AuthContext] ❌ Auth init failed | status:', status, '| reason:', reason || message);

      setUser(null);
      setUserProfile(null);

      if (reason === 'user_not_registered') {
        console.log('[AuthContext] → error type: user_not_registered');
        setAuthError({ type: 'user_not_registered' });
      } else if (status === 401 || status === 403) {
        console.log('[AuthContext] → error type: auth_required (explicit 401/403)');
        setAuthError({ type: 'auth_required' });
      } else {
        // Network blip / timeout — do NOT redirect to login
        console.warn('[AuthContext] → error type: network_error — will NOT redirect to login');
        setAuthError({ type: 'network_error', message });
      }
    } finally {
      setIsLoadingAuth(false);
      console.log('[AuthContext] 🏁 Auth init complete | user:', !!user);
    }
  };

  const loadUserProfile = async (currentUser, retries = 1) => {
    const email = normalizeEmail(currentUser?.email || '');
    console.log('[AuthContext] 🔍 Loading UserProfile for user_id:', currentUser?.id, '| email:', email);

    const doLoad = async () => {
      const profiles = await base44.entities.UserProfile.filter(
        { user_id: currentUser.id, is_deleted: false }, '-created_date', 1
      );

      if (profiles.length > 0) {
        const p = profiles[0];
        console.log('[AuthContext] ✅ UserProfile found | id:', p.id, '| status:', p.onboarding_status, '| company_id:', p.company_id);
        setUserProfile(p);
        return p;
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
        console.log('[AuthContext] 🔧 Found orphaned company, repairing UserProfile…');
        const repaired = await repairMissingUserProfile(currentUser, companiesByEmail[0]);
        if (repaired) {
          console.log('[AuthContext] ✅ Profile repair successful | id:', repaired.id);
          setUserProfile(repaired);
          return repaired;
        }
      }

      console.log('[AuthContext] ℹ️ No profile & no company → needsOnboarding = true');
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

  const markOnboardingComplete = () => {
    console.log('[AuthContext] ✅ markOnboardingComplete() — needsOnboarding → false');
    setUserProfile((prev) =>
      prev ? { ...prev, onboarding_status: 'onboarding_completed' } : prev
    );
  };

  const logout = () => {
    console.log('[AuthContext] 🚪 Logging out…');
    localStorage.removeItem('base44_session_start');
    setUser(null);
    setUserProfile(null);
    setAuthError(null);
    base44.auth.logout('/');
  };

  const isAuthenticated = !!user;
  const needsOnboarding = isAuthenticated && (
    !userProfile ||
    INCOMPLETE_STATUSES.includes(userProfile?.onboarding_status)
  );

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