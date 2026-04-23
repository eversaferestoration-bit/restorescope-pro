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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Resolved profile state — null until loaded
  const [userProfile, setUserProfile] = useState(null);
  // true = still verifying session / loading profile
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
    try {
      // 1. Verify session
      const currentUser = await base44.auth.me();
      console.log('[AuthContext] Session verified:', normalizeEmail(currentUser?.email || ''));
      setUser(currentUser);

      // 2. Fetch UserProfile (needed for route guards)
      await loadUserProfile(currentUser);
    } catch (error) {
      setUser(null);
      setUserProfile(null);
      const status = error?.status || error?.response?.status;
      const reason = error?.data?.extra_data?.reason || error?.response?.data?.extra_data?.reason;
      console.log('[AuthContext] Auth failed. Status:', status, '| Reason:', reason || error?.message);

      if (reason === 'user_not_registered') {
        setAuthError({ type: 'user_not_registered' });
      } else if (status === 401 || status === 403) {
        setAuthError({ type: 'auth_required' });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loadUserProfile = async (currentUser) => {
    const email = normalizeEmail(currentUser?.email || '');
    try {
      const profiles = await base44.entities.UserProfile.filter(
        { user_id: currentUser.id, is_deleted: false }, '-created_date', 1
      );

      if (profiles.length > 0) {
        setUserProfile(profiles[0]);
        return profiles[0];
      }

      // No profile — attempt auto-repair via company lookup
      console.warn('[AuthContext] No UserProfile found — attempting repair for:', email);
      const companiesByEmail = await base44.entities.Company.filter(
        { created_by: email, is_deleted: false }, '-created_date', 1
      ).catch(() => []);

      if (companiesByEmail.length > 0) {
        const repaired = await repairMissingUserProfile(currentUser, companiesByEmail[0]);
        if (repaired) {
          setUserProfile(repaired);
          return repaired;
        }
      }

      // No profile and no repairable company — user needs onboarding
      setUserProfile(null);
      return null;
    } catch (e) {
      console.warn('[AuthContext] Profile load failed (network?):', e?.message);
      // Fail open — don't block the user due to a network blip
      setUserProfile(null);
      return null;
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    return loadUserProfile(user);
  };

  const logout = () => {
    setUser(null);
    setUserProfile(null);
    setAuthError(null);
    base44.auth.logout('/');
  };

  // Derived flags used by route guards
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
      isLoadingPublicSettings: false, // kept for backward compat
      authError,
      needsOnboarding,
      logout,
      checkUserAuth: initialize,
      refreshUserProfile,
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