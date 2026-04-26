import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext(null);

const INCOMPLETE_ONBOARDING_STATUSES = new Set([
  'account_created',
  'company_started',
  'company_completed',
  'role_selected',
  'pricing_profile_set',
]);

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function getErrorStatus(error) {
  return error?.status || error?.response?.status || error?.response?.data?.status || null;
}

function getErrorReason(error) {
  return error?.response?.data?.extra_data?.reason || error?.response?.data?.reason || error?.reason || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryNonAuthError(fn, attempts = 2, delayMs = 300) {
  let lastError;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);

      if (status === 401 || status === 403) {
        throw error;
      }

      if (index < attempts - 1) {
        await sleep(delayMs * (index + 1));
      }
    }
  }

  throw lastError;
}

function mapAuthError(error) {
  const status = getErrorStatus(error);
  const reason = getErrorReason(error);
  const message = error?.message || 'Authentication failed.';

  if (reason === 'user_not_registered') {
    return { type: 'user_not_registered', status, message };
  }

  if (status === 401 || status === 403) {
    return { type: 'auth_required', status, message };
  }

  return { type: 'network_error', status, message };
}

async function loadProfileForUser(user) {
  if (!user?.id) return null;

  const email = normalizeEmail(user.email);

  const profilesByUserId = await base44.entities.UserProfile.filter(
    { user_id: user.id, is_deleted: false },
    '-created_date',
    1
  );

  if (profilesByUserId?.length) {
    return profilesByUserId[0];
  }

  if (!email) return null;

  const profilesByEmail = await base44.entities.UserProfile.filter(
    { email, is_deleted: false },
    '-created_date',
    1
  ).catch(() => []);

  if (profilesByEmail?.length) {
    return profilesByEmail[0];
  }

  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const initRef = useRef(false);

  const initializeAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthChecked(false);
    setAuthError(null);

    try {
      const currentUser = await retryNonAuthError(() => base44.auth.me(), 2, 300);
      const currentProfile = await retryNonAuthError(() => loadProfileForUser(currentUser), 2, 300)
        .catch((error) => {
          console.warn('[AuthContext] UserProfile load failed. Continuing to onboarding.', error?.message || error);
          return null;
        });

      setUser(currentUser || null);
      setUserProfile(currentProfile || null);
      setAuthError(null);
    } catch (error) {
      const mappedError = mapAuthError(error);
      console.warn('[AuthContext] Auth check failed:', mappedError);

      setUser(null);
      setUserProfile(null);
      setAuthError(mappedError);
    } finally {
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    initializeAuth();
  }, [initializeAuth]);

  const checkUserAuth = useCallback(async () => {
    await initializeAuth();
  }, [initializeAuth]);

  const refreshUserProfile = useCallback(async () => {
    if (!user?.id) return null;

    const currentProfile = await loadProfileForUser(user).catch((error) => {
      console.warn('[AuthContext] Refresh profile failed:', error?.message || error);
      return null;
    });

    setUserProfile(currentProfile || null);
    return currentProfile || null;
  }, [user]);

  const markOnboardingComplete = useCallback(() => {
    setUserProfile((previous) => ({
      ...(previous || {}),
      onboarding_status: 'onboarding_completed',
      current_onboarding_step: 6,
    }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setUserProfile(null);
    setAuthError(null);
    setAuthChecked(true);
    setIsLoadingAuth(false);
    localStorage.removeItem('base44_access_token');
    localStorage.removeItem('base44_session_start');
    base44.auth.logout('/login');
  }, []);

  const isAuthenticated = Boolean(user);
  const needsOnboarding = Boolean(
    isAuthenticated &&
      (!userProfile || INCOMPLETE_ONBOARDING_STATUSES.has(userProfile?.onboarding_status))
  );

  const value = useMemo(() => ({
    user,
    userProfile,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authChecked,
    authError,
    needsOnboarding,
    logout,
    checkUserAuth,
    refreshUserProfile,
    markOnboardingComplete,
  }), [
    user,
    userProfile,
    isAuthenticated,
    isLoadingAuth,
    authChecked,
    authError,
    needsOnboarding,
    logout,
    checkUserAuth,
    refreshUserProfile,
    markOnboardingComplete,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
