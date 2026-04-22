import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeEmail } from '@/lib/authRepair';

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

  // Validate required account records exist
  const checkAccountState = async (authUser) => {
    if (!authUser) return null;
    
    try {
      console.log('[AuthContext] Checking account state for user:', authUser.id);

      // Check UserProfile exists
      const profiles = await base44.entities.UserProfile.filter({ user_id: authUser.id, is_deleted: false });
      if (profiles.length === 0) {
        console.warn('[AuthContext] No UserProfile found — redirecting to account-recovery');
        setAccountState('incomplete');
        return 'incomplete';
      }

      const profile = profiles[0];
      console.log('[AuthContext] UserProfile found:', profile.id);

      // Check Company exists
      if (!profile.company_id) {
        console.warn('[AuthContext] No company_id in profile — setup required');
        setAccountState('setup_required');
        return 'setup_required';
      }

      const companies = await base44.entities.Company.filter({ id: profile.company_id, is_deleted: false });
      if (companies.length === 0) {
        console.warn('[AuthContext] Company not found — setup required');
        setAccountState('setup_required');
        return 'setup_required';
      }

      console.log('[AuthContext] Company found:', profile.company_id);

      // Check onboarding status
      if (profile.onboarding_status && profile.onboarding_status !== 'onboarding_completed') {
        console.log('[AuthContext] Onboarding incomplete — state:', profile.onboarding_status);
        setAccountState('onboarding_incomplete');
        return 'onboarding_incomplete';
      }

      console.log('[AuthContext] Account state is READY');
      setAccountState('ready');
      return 'ready';
    } catch (err) {
      console.error('[AuthContext] Account state check failed:', err?.message || err);
      // Don't block access on transient errors — treat as ready and let pages handle their own errors
      setAccountState('ready');
      return 'ready';
    }
  };

  const repairMissingUserProfile = async (authUser) => {
    console.log('[AuthContext] Attempting to repair missing UserProfile for user:', authUser.id);
    try {
      // Check if company exists for this user
      const companies = await base44.entities.Company.filter({ created_by: authUser.email, is_deleted: false });
      let companyId = null;

      if (companies.length > 0) {
        companyId = companies[0].id;
        console.log('[AuthContext] Found existing company:', companyId);
      }

      // Create UserProfile
      const profile = await base44.entities.UserProfile.create({
        user_id: authUser.id,
        company_id: companyId || null,
        email: authUser.email,
        role: 'admin',
        onboarding_status: companyId ? 'onboarding_completed' : 'account_created',
        current_onboarding_step: 1,
        completed_steps: [],
        is_deleted: false,
      });
      console.log('[AuthContext] Repaired UserProfile:', profile.id);
      return profile;
    } catch (e) {
      console.error('[AuthContext] Repair failed:', e?.message);
      return null;
    }
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await base44.auth.me();
      // Log normalized email for debugging
      const normalizedEmail = normalizeEmail(currentUser?.email || '');
      console.log('[AuthContext] User loaded. Email (normalized):', normalizedEmail, '| Role:', currentUser?.role);
      setUser(currentUser);
      setIsAuthenticated(true);

      // Try to repair if profile is missing
      const profiles = await base44.entities.UserProfile.filter({ user_id: currentUser.id, is_deleted: false }).catch(() => []);
      if (profiles.length === 0) {
        console.warn('[AuthContext] No UserProfile found — attempting repair');
        const repaired = await repairMissingUserProfile(currentUser);
        if (!repaired) {
          console.log('[AuthContext] Repair failed — will proceed to auth-check');
        }
      }

      // After successful auth, check account state
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