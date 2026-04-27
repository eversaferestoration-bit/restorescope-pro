import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [onboardingCompleteLocal, setOnboardingCompleteLocal] = useState(false);

  const getOnboardingKey = (currentUser) => {
    return `rs_onboarding_complete_${currentUser?.id || currentUser?.email || "current_user"}`;
  };

  const markOnboardingComplete = () => {
    try {
      const key = getOnboardingKey(user);
      localStorage.setItem(key, "true");
      setOnboardingCompleteLocal(true);
    } catch (error) {
      console.warn("Could not save local onboarding override:", error);
    }

    setUserProfile((prev) => ({
      ...(prev || {}),
      onboarding_status: "onboarding_completed",
      current_onboarding_step: 6,
      onboarding_completed_at: new Date().toISOString(),
    }));
  };

  const loadAuth = async () => {
    setLoading(true);
    setAuthError(null);

    try {
      const currentUser = await base44.auth.getUser();

      if (!currentUser) {
        setUser(null);
        setUserProfile(null);
        setOnboardingCompleteLocal(false);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const key = getOnboardingKey(currentUser);
      const localComplete = localStorage.getItem(key) === "true";
      setOnboardingCompleteLocal(localComplete);

      let profiles = [];

      try {
        profiles = await base44.entities.UserProfile.filter({
          user_id: currentUser.id,
          is_deleted: false,
        });
      } catch (error) {
        console.warn("UserProfile lookup by user_id failed:", error);
      }

      if ((!profiles || profiles.length === 0) && currentUser.email) {
        try {
          profiles = await base44.entities.UserProfile.filter({
            email: currentUser.email,
            is_deleted: false,
          });
        } catch (error) {
          console.warn("UserProfile lookup by email failed:", error);
        }
      }

      const profile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
      setUserProfile(profile);
    } catch (error) {
      console.error("Auth load failed:", error);
      setAuthError(error);
      setUser(null);
      setUserProfile(null);
      setOnboardingCompleteLocal(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuth();
  }, []);

  const login = async () => {
    try {
      await base44.auth.redirectToLogin();
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError(error);
    }
  };

  const logout = async () => {
    try {
      await base44.auth.logout();
    } catch (error) {
      console.warn("Logout failed:", error);
    } finally {
      setUser(null);
      setUserProfile(null);
      setOnboardingCompleteLocal(false);
    }
  };

  const isAuthenticated = !!user;

  const needsOnboarding = useMemo(() => {
    if (!isAuthenticated) return false;
    if (onboardingCompleteLocal) return false;

    const status = userProfile?.onboarding_status;

    if (!userProfile) return true;

    return status !== "onboarding_completed";
  }, [isAuthenticated, userProfile, onboardingCompleteLocal]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        authError,
        isAuthenticated,
        needsOnboarding,
        markOnboardingComplete,
        refreshAuth: loadAuth,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}