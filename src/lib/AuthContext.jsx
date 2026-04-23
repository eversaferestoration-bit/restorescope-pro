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

// Detect if app-params just stored a fresh token this page load.
// app-params.js strips access_token from the URL immediately (removeFromUrl:true),
// so by the time AuthContext runs the URL is already clean.
// Instead we check if localStorage was written THIS page load by comparing
// the token against a session-scoped flag.
function hasFreshTokenThisLoad() {
  try {
    // app-params writes the token to localStorage synchronously at module init.
    // We mark that it happened so AuthContext knows to wait an extra tick.
    const flag = sessionStorage.getItem('base44_fresh_token_load');
    return flag === 'true';
  } catch {
    return false;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  // isLoadingAuth stays true until BOTH user AND userProfile are resolved.
  // Guards must never act on state while this is true.
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
    // Reset initDone so manual re-init (checkUserAuth) always runs
    initDone.current = true;
    console.log('[AuthContext] 🔄 Initializing auth | pathname:', window.location.pathname, '| freshToken:', sessionStorage.getItem('base44_fresh_token_load'));

    // If app-params just wrote a fresh token this page load, wait a tick
    // to ensure the SDK has picked it up before calling me().
    if (hasFreshTokenThisLoad()) {
      console.log('[AuthContext] 🪙 Fresh token detected this load — waiting for SDK sync…');
      sessionStorage.removeItem('base44_fresh_token_load');
      await new Promise(r => setTimeout(r, 100));
    }

    try {
      console.log('[AuthContext] 📡 Calling base44.auth.me()…');
      let currentUser;
      try {
        currentUser = await withRetry(() => base44.auth.me(), 3, 300);
      } catch (meError) {
        const status = meError?.status || meError?.response?.status;
        const body   = meError?.data || meError?.response?.data;
        const reason = body?.extra_data?.reason || body?.message;
        console.error('[AuthContext] ❌ base44.auth.me() FAILED', {
          status,
          reason,
          body: JSON.stringify(body),
          message: meError?.message,
        });
        throw meError; // re-throw to outer catch
      }

      console.log('[AuthContext] ✅ me() succeeded | email:', normalizeEmail(currentUser?.email || ''), '| id:', currentUser?.id, '| role:', currentUser?.role);
      localStorage.setItem('base44_session_start', Date.now().toString());

      // Load profile before committing any state — guards won't fire until
      // setIsLoadingAuth(false) below, so we can resolve everything atomically.
      console.log('[AuthContext] 📡 Loading user profile…');
      const profile = await loadUserProfile(currentUser, 2);
      console.log('[AuthContext] 📋 Profile result:', profile ? `id=${profile.id?.slice(-8)} status=${profile.onboarding_status} company=${profile.company_id?.slice(-8)}` : 'null (→ onboarding)');

      // Commit user + profile together, then drop the loading gate.
      setUser(currentUser);
      setUserProfile(profile);
      setIsLoadingAuth(false);
      console.log('[AuthContext] 🏁 Auth ready | needsOnboarding:', !profile || INCOMPLETE_STATUSES.includes(profile?.onboarding_status));

    } catch (error) {
      const status  = error?.status || error?.response?.status;
      const reason  = error?.data?.extra_data?.reason || error?.response?.data?.extra_data?.reason;
      const message = error?.message || String(error);
      console.error('[AuthContext] ❌ Auth init failed', { status, reason, message });

      setUser(null);
      setUserProfile(null);

      if (reason === 'user_not_registered') {
        console.log('[AuthContext] → FAILURE POINT: user_not_registered');
        setAuthError({ type: 'user_not_registered' });
      } else if (status === 401 || status === 403) {
        console.log('[AuthContext] → FAILURE POINT: auth_required (401/403) — session invalid or token expired');
        setAuthError({ type: 'auth_required' });
      } else {
        console.warn('[AuthContext] → FAILURE POINT: network_error — NOT redirecting to login (may recover)');
        setAuthError({ type: 'network_error', message });
      }

      setIsLoadingAuth(false);
    }
  };

  // Pure data-fetcher — returns profile or null, does NOT call setUserProfile.
  // Callers are responsible for committing the result to state.
  const loadUserProfile = async (currentUser, retries = 1) => {
    const email = normalizeEmail(currentUser?.email || '');
    console.log('[AuthContext] 🔍 Loading UserProfile for user_id:', currentUser?.id, '| email:', email);

    const doLoad = async () => {
      let profiles;
      try {
        profiles = await base44.entities.UserProfile.filter(
          { user_id: currentUser.id, is_deleted: false }, '-created_date', 1
        );
        console.log('[AuthContext] 🔍 UserProfile query result: count=', profiles.length, '| query user_id=', currentUser.id);
      } catch (filterErr) {
        const status = filterErr?.status || filterErr?.response?.status;
        console.error('[AuthContext] ❌ UserProfile.filter() FAILED — possible RLS block', { status, message: filterErr?.message });
        throw filterErr;
      }

      if (profiles.length > 0) {
        const p = profiles[0];
        console.log('[AuthContext] ✅ UserProfile found | id:', p.id, '| status:', p.onboarding_status, '| company_id:', p.company_id);
        return p;
      }

      // No profile — attempt auto-repair via company lookup
      console.warn('[AuthContext] ⚠️ No UserProfile found for user_id:', currentUser.id, '— attempting repair for email:', email);
      const companiesByEmail = await base44.entities.Company.filter(
        { created_by: email, is_deleted: false }, '-created_date', 1
      ).catch((e) => {
        console.warn('[AuthContext] Company lookup failed during repair:', e?.message, '| status:', e?.status || e?.response?.status);
        return [];
      });

      console.log('[AuthContext] 🏢 Company repair lookup: found', companiesByEmail.length, 'companies');

      if (companiesByEmail.length > 0) {
        console.log('[AuthContext] 🔧 Repairing orphaned UserProfile for company:', companiesByEmail[0].id);
        const repaired = await repairMissingUserProfile(currentUser, companiesByEmail[0]);
        if (repaired) {
          console.log('[AuthContext] ✅ Profile repair successful | id:', repaired.id);
          return repaired;
        }
        console.warn('[AuthContext] ⚠️ Profile repair returned null');
      }

      console.log('[AuthContext] ℹ️ No profile & no company → will route to onboarding');
      return null;
    };

    try {
      return await withRetry(doLoad, retries);
    } catch (e) {
      const status = e?.status || e?.response?.status;
      console.warn('[AuthContext] ⚠️ Profile load failed after retries | status:', status, '| message:', e?.message, '— failing open (→ onboarding)');
      return null;
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    console.log('[AuthContext] 🔄 Refreshing UserProfile…');
    const profile = await loadUserProfile(user, 2);
    setUserProfile(profile);
    return profile;
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