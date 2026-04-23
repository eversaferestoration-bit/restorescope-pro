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

// ── Debug logger — always visible in console with structured data ──
function authLog(level, step, message, data = {}) {
  const prefix = `[AuthContext][${step}]`;
  const payload = { ...data, _ts: new Date().toISOString() };
  if (level === 'error') {
    console.error(prefix, message, payload);
  } else if (level === 'warn') {
    console.warn(prefix, message, payload);
  } else {
    console.log(prefix, message, payload);
  }
}

// Retry an async fn up to `attempts` times with exponential backoff.
// Never retries on 401/403 — those are definitive auth rejections.
async function withRetry(fn, attempts = 3, delayMs = 400) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const status = e?.status || e?.response?.status;
      if (status === 401 || status === 403) throw e;
      authLog('warn', 'withRetry', `Attempt ${i + 1}/${attempts} failed`, {
        status,
        message: e?.message,
        willRetry: i < attempts - 1,
      });
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

// app-params.js strips the access_token from the URL synchronously at module import,
// so by the time AuthContext runs, it's already gone from the URL but in localStorage.
// We capture the flag at module load time (before React renders) to detect a fresh login.
const HAD_FRESH_TOKEN_ON_LOAD = (() => {
  try {
    return new URLSearchParams(window.location.search).has('access_token');
  } catch {
    return false;
  }
})();

// How long to wait for the token to land in localStorage after a login redirect.
// Even though app-params.js runs synchronously, the SDK may need a tick to re-read it.
const TOKEN_SETTLE_MS = 150;

export const AuthProvider = ({ children }) => {
  const [user, setUser]                   = useState(null);
  const [userProfile, setUserProfile]     = useState(null);
  // isLoadingAuth stays true until BOTH user AND userProfile are fully resolved.
  // No guard anywhere in the app may act on auth state while this is true.
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError]         = useState(null);
  const [authDebug, setAuthDebug]         = useState(null); // visible debug state
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    initialize();
  }, []);

  const initialize = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    setAuthDebug(null);
    authLog('info', 'initialize', '🔄 Starting auth initialization');

    // ── Step 1: Token settle ──
    // HAD_FRESH_TOKEN_ON_LOAD is captured at module init before app-params strips it.
    if (HAD_FRESH_TOKEN_ON_LOAD) {
      authLog('info', 'initialize', `🪙 Fresh login detected — waiting ${TOKEN_SETTLE_MS}ms for SDK to pick up token`);
      await new Promise(r => setTimeout(r, TOKEN_SETTLE_MS));
    }

    const storedToken = localStorage.getItem('base44_access_token');
    authLog('info', 'initialize', '🔑 Token state', {
      freshLoginDetected: HAD_FRESH_TOKEN_ON_LOAD,
      hasStoredToken: !!storedToken,
      tokenPreview: storedToken ? storedToken.slice(0, 12) + '…' : null,
    });

    // ── Step 2: Fetch current user ──
    let currentUser = null;
    try {
      currentUser = await withRetry(() => base44.auth.me(), 3, 400);
      authLog('info', 'initialize', '✅ base44.auth.me() succeeded', {
        userId: currentUser?.id,
        email: normalizeEmail(currentUser?.email || ''),
        role: currentUser?.role,
      });
      localStorage.setItem('base44_session_start', Date.now().toString());
    } catch (error) {
      const status  = error?.status || error?.response?.status;
      const reason  = error?.data?.extra_data?.reason
                   || error?.response?.data?.extra_data?.reason;
      const message = error?.message || String(error);

      authLog('error', 'initialize', '❌ base44.auth.me() FAILED', {
        status,
        reason,
        message,
        errorKeys: Object.keys(error || {}),
        responseData: error?.response?.data || error?.data,
      });

      setUser(null);
      setUserProfile(null);

      let errorType;
      if (reason === 'user_not_registered') {
        errorType = 'user_not_registered';
      } else if (status === 401 || status === 403) {
        errorType = 'auth_required';
      } else {
        // Network/timeout — do NOT redirect. Let user retry.
        errorType = 'network_error';
      }

      authLog('info', 'initialize', `→ classified as: ${errorType}`);
      setAuthError({ type: errorType, message, status });
      setAuthDebug({ step: 'auth.me', status, reason, message, errorType });
      setIsLoadingAuth(false);
      return;
    }

    // ── Step 3: Load UserProfile ──
    authLog('info', 'initialize', '🔍 Loading UserProfile…', { userId: currentUser.id });
    const profile = await loadUserProfile(currentUser, 2);

    authLog('info', 'initialize', '🏁 Auth fully resolved', {
      userId: currentUser.id,
      profileId: profile?.id ?? null,
      companyId: profile?.company_id ?? null,
      onboardingStatus: profile?.onboarding_status ?? null,
      needsOnboarding: !profile || INCOMPLETE_STATUSES.includes(profile?.onboarding_status),
    });

    // ── Step 4: Commit atomically — no intermediate null states leak to guards ──
    setUser(currentUser);
    setUserProfile(profile);
    setAuthDebug({
      step: 'complete',
      userId: currentUser.id,
      profileId: profile?.id,
      companyId: profile?.company_id,
      onboardingStatus: profile?.onboarding_status,
    });
    setIsLoadingAuth(false);
  };

  // Pure data-fetcher — returns profile or null, never calls setUserProfile.
  // Callers commit the result to state.
  const loadUserProfile = async (currentUser, retries = 2) => {
    const email = normalizeEmail(currentUser?.email || '');

    const doLoad = async () => {
      // ── Attempt 1: direct user_id match ──
      let profiles = [];
      try {
        profiles = await base44.entities.UserProfile.filter(
          { user_id: currentUser.id, is_deleted: false }, '-created_date', 1
        );
        authLog('info', 'loadUserProfile', 'UserProfile query result', {
          userId: currentUser.id,
          resultCount: profiles.length,
          profileIds: profiles.map(p => p.id),
        });
      } catch (e) {
        authLog('error', 'loadUserProfile', '❌ UserProfile fetch threw', {
          status: e?.status || e?.response?.status,
          message: e?.message,
          responseData: e?.response?.data,
        });
        throw e; // Let withRetry handle it
      }

      if (profiles.length > 0) {
        const p = profiles[0];
        authLog('info', 'loadUserProfile', '✅ Profile found', {
          id: p.id, companyId: p.company_id, status: p.onboarding_status,
        });
        return p;
      }

      // ── Attempt 2: auto-repair via company lookup ──
      authLog('warn', 'loadUserProfile', '⚠️ No UserProfile — attempting company lookup repair', { email });
      let companiesByEmail = [];
      try {
        companiesByEmail = await base44.entities.Company.filter(
          { created_by: email, is_deleted: false }, '-created_date', 1
        );
        authLog('info', 'loadUserProfile', 'Company lookup result', {
          email, resultCount: companiesByEmail.length,
        });
      } catch (e) {
        authLog('warn', 'loadUserProfile', 'Company lookup failed (non-fatal)', { message: e?.message });
      }

      if (companiesByEmail.length > 0) {
        authLog('info', 'loadUserProfile', '🔧 Repairing orphaned profile…');
        const repaired = await repairMissingUserProfile(currentUser, companiesByEmail[0]);
        if (repaired) {
          authLog('info', 'loadUserProfile', '✅ Repair successful', { id: repaired.id });
          return repaired;
        }
        authLog('warn', 'loadUserProfile', 'Repair returned null — treating as no profile');
      }

      authLog('info', 'loadUserProfile', 'ℹ️ No profile & no company → onboarding required');
      return null;
    };

    try {
      return await withRetry(doLoad, retries);
    } catch (e) {
      authLog('warn', 'loadUserProfile', '⚠️ Profile load failed after all retries — failing open to onboarding', {
        message: e?.message,
        status: e?.status || e?.response?.status,
      });
      return null;
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    authLog('info', 'refreshUserProfile', '🔄 Refreshing…');
    const profile = await loadUserProfile(user, 2);
    setUserProfile(profile);
    return profile;
  };

  const markOnboardingComplete = () => {
    authLog('info', 'markOnboardingComplete', '✅ Flipping onboarding_status → onboarding_completed');
    setUserProfile((prev) =>
      prev ? { ...prev, onboarding_status: 'onboarding_completed' } : prev
    );
  };

  const logout = () => {
    authLog('info', 'logout', '🚪 Logging out');
    localStorage.removeItem('base44_session_start');
    setUser(null);
    setUserProfile(null);
    setAuthError(null);
    setAuthDebug(null);
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
      authDebug,
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