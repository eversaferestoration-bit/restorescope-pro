import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeEmail } from '@/lib/authRepair';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Start as loading — nothing renders until session is verified
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const initDone = useRef(false);

  useEffect(() => {
    // Only run once — guard against StrictMode double-invoke
    if (initDone.current) return;
    initDone.current = true;
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await base44.auth.me();
      const normalizedEmail = normalizeEmail(currentUser?.email || '');
      console.log('[AuthContext] Session verified. Email:', normalizedEmail, '| Role:', currentUser?.role);
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      const status = error?.status || error?.response?.status;
      const reason = error?.data?.extra_data?.reason || error?.response?.data?.extra_data?.reason;
      console.log('[AuthContext] Auth check failed. Status:', status, '| Reason:', reason || error?.message);

      if (reason === 'user_not_registered') {
        setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
      } else if (status === 401 || status === 403) {
        // Not logged in — not an error per se, just unauthenticated
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
      // For network/unknown errors don't set authError — fail open
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    base44.auth.logout('/');
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      // Never expose a "public settings" loading state — keep it simple
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      authChecked,
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};