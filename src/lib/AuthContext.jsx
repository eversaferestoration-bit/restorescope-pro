import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext(null);

const INCOMPLETE_STATUSES = [
  'account_created',
  'company_started',
  'company_completed',
  'role_selected',
  'pricing_profile_set',
];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getOnboardingKey(user) {
  return `rs_onboarding_complete_${user?.id || user?.email || 'current_user'}`;
}

async function withTimeout(promise, ms = 8000, label = 'request') {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function getCurrentUserSafe() {
  if (base44?.auth?.me) {
    return await withTimeout(base44.auth.me(), 8000, 'base44.auth.me');
  }

  if (base44?.auth?.getUser) {
    return await withTimeout(base44.auth.getUser(), 8000, 'base44.auth.getUser');
  }

  throw new Error('No Base44 auth method found.');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [onboardingCompleteLocal, setOnboardingCompleteLocal] = useState(false);

  const initStarted = useRef(false);

  const loadUserProfile = async (currentUser) => {
    if (!currentUser) return null;

    const userId = currentUser.id;
    const email = normalizeEmail(currentUser.email);

    let profiles = [];

    if (userId) {
      try {
        profiles = await withTimeout(
          base44.entities.UserProfile.filter(
            { user_id: userId, is_deleted: false },
            '-created_date',
            1
          ),
          8000,
          'UserProfile.filter by user_id'
        );
      } catch (error) {
        console.warn('[AuthContext] UserProfile lookup by user_id failed:', error?.message || error);
      }
    }

    if ((!profiles || profiles.length === 0) && email) {
      try {
        profiles = await withTimeout(
          base44.entities.UserProfile.filter(
            { email, is_deleted: false },
            '-created_date',
            1
          ),
          8000,
          'UserProfile.filter by email'
        );
      } catch (error) {
        console.warn('[AuthContext] UserProfile lookup by email failed:', error?.message || error);
      }
    }

    return Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const currentUser = await getCurrentUserSafe();

      if (!currentUser) {
        setUser(null);
        setUserProfile(null);
        setOnboardingCompleteLocal(false);
        return;
      }

      let localComplete = false;

      try {
        localComplete = localStorage.getItem(getOnboardingKey(currentUser)) === 'true';
      } catch {
        localComplete = false;
      }

      const profile = await loadUserProfile(currentUser);

      setUser(currentUser);
      setUserProfile(profile);
      setOnboardingCompleteLocal(localComplete);
    } catch (error) {
      const status = error?.status || error?.response?.status;
      const reason =
        error?.data?.extra_data?.reason ||
        error?.response?.data?.extra_data?.reason;

      console.error('[AuthContext] Auth check failed:', error?.message || error);

      setUser(null);
      setUserProfile(null);
      setOnboardingCompleteLocal(false);

      if (reason === 'user_not_registered') {
        setAuthError({ type: 'user_not_registered', message: error?.message || 'User is not registered.' });
      } else if (status === 401 || status === 403) {
        setAuthError({ type: 'auth_required', message: error?.message || 'Authentication required.' });
      } else {
        setAuthError({ type: 'network_error', message: error?.message || 'Could not verify session.' });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    checkUserAuth();
  }, []);

  const refreshUserProfile = async () => {
    if (!user) return null;

    const profile = await loadUserProfile(user);
    setUserProfile(profile);
    return profile;
  };

  const markOnboardingComplete = () => {
    try {
      if (user) {
        localStorage.setItem(getOnboardingKey(user), 'true');
      }
    } catch (error) {
      console.warn('[AuthContext] Could not save onboarding override:', error?.message || error);
    }

    setOnboardingCompleteLocal(true);

    setUserProfile((prev) => ({
      ...(prev || {}),
      onboarding_status: 'onboarding_completed',
      current_onboarding_step: 6,
      onboarding_completed_at: new Date().toISOString(),
    }));
  };

  const logout = async () => {
    try {
      if (user) {
        localStorage.removeItem(getOnboardingKey(user));
      }

      localStorage.removeItem('base44_session_start');
    } catch {}

    setUser(null);
    setUserProfile(null);
    setAuthError(null);
    setOnboardingCompleteLocal(false);
    setIsLoadingAuth(false);

    try {
      await base44.auth.logout('/');
    } catch (error) {
      console.warn('[AuthContext] Logout failed:', error?.message || error);
    }
  };

  const isAuthenticated = !!user;

  const needsOnboarding =
    isAuthenticated &&
    !onboardingCompleteLocal &&
    (!userProfile || INCOMPLETE_STATUSES.includes(userProfile?.onboarding_status));

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isAuthenticated,
        isLoadingAuth,
        loading: isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        needsOnboarding,
        logout,
        checkUserAuth,
        refreshAuth: checkUserAuth,
        refreshUserProfile,
        markOnboardingComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}