import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeEmail, diagnoseAccountState } from '@/lib/authRepair';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accountState, setAccountState] = useState(null); // 'incomplete', 'setup_required', 'ready'
  const [accountStateChecked, setAccountStateChecked] = useState(false);

  useEffect(() => {
    checkUserAuth();
  }, []);

  // Validate required account records — delegates to diagnoseAccountState for email-fallback healing
  const checkAccountState = async (authUser) => {
    if (!authUser) return null;
    try {
      const { state } = await diagnoseAccountState(authUser);
      console.log('[AuthContext] Account state:', state);
      const stateMap = {
        ok: 'ready',
        no_profile: 'incomplete',
        no_company: 'setup_required',
        onboarding_incomplete: 'onboarding_incomplete',
      };
      const mapped = stateMap[state] || 'ready';
      setAccountState(mapped);
      return mapped;
    } catch (err) {
      console.error('[AuthContext] Account state check failed:', err?.message || err);
      setAccountState('ready');
      return 'ready';
    }
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await base44.auth.me();
      const normalizedEmail = normalizeEmail(currentUser?.email || '');
      console.log('[AuthContext] User loaded. Email (normalized):', normalizedEmail, '| Role:', currentUser?.role);
      setUser(currentUser);
      setIsAuthenticated(true);
      // Check account state (includes repair logic via diagnoseAccountState)
      await checkAccountState(currentUser);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      const status = error?.status || error?.response?.status;
      const reason = error?.data?.extra_data?.reason || error?.response?.data?.extra_data?.reason;
      console.log('[AuthContext] Auth check failed. Status:', status, '| Reason:', reason || error?.message);
      if (status === 401 || status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      } else if (reason === 'user_not_registered') {
        setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
      }
      // For other errors (network, etc.) don't set authError — let the app render normally
    } finally {
      setIsLoadingAuth(false);
      setAccountStateChecked(true);
      setAuthChecked(true);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout('/');
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      authChecked,
      accountState,
      accountStateChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};