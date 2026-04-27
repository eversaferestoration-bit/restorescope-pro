import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from "react";
import { base44 } from "@/api/base44Client";

const AuthContext = createContext(null);

const INCOMPLETE_STATUSES = [
  "account_created",
  "company_started",
  "company_completed",
  "role_selected",
  "pricing_profile_set",
];

function getUserKey(user) {
  return `rs_onboarding_complete_${user?.id || user?.email || "current_user"}`;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function withTimeout(promise, ms = 8000, label = "request") {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getCurrentUserSafe() {
  if (base44?.auth?.me) {
    return await withTimeout(base44.auth.me(), 8000, "base44.auth.me");
  }

  if (base44?.auth?.getUser) {
    return await withTimeout(base44.auth.getUser(), 8000, "base44.auth.getUser");
  }

  throw new Error("No Base44 auth method found.");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
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
          base44.entities.UserProfile.filter({
            user_id: userId,
            is_deleted: false,
          }),
          8000,
          "UserProfile.filter by user_id"
        );
      } catch (error) {
        console.warn("[AuthContext] UserProfile lookup by user_id failed:", error);
      }
    }

    if ((!profiles || profiles.length === 0) && email) {
      try {
        profiles = await withTimeout(
          base44.entities.UserProfile.filter({
            email,
            is_deleted: false,
          }),
          8000,
          "UserProfile.filter by email"
        );
      } catch (error) {
        console.warn("[AuthContext] UserProfile lookup by email failed:", error);
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

      const profile = await loadUserProfile(currentUser);

      let localComplete = false;
      try {
        localComplete = localStorage.getItem(getUserKey(currentUser)) === "true";
      } catch {
        localComplete = false;
      }

      setUser(currentUser);
      setUserProfile(profile);
      setOnboardingCompleteLocal(localComplete);
    } catch (error) {
      const status = error?.status || error?.response?.status;
      const reason =
        error?.data?.extra_data?.reason ||
        error?.response?.data?.extra_data?.reason;

      console.error("[AuthContext] Auth check failed:", error);

      setUser(null);
      setUserProfile(null);
      setOnboardingCompleteLocal(false);

      if (reason === "user_not_registered") {
        setAuthError({ type: "user_not_registered", message: error.message });
      } else if (status === 401 || status === 403) {
        setAuthError({ type: "auth_required", message: error.message });
      } else {
        setAuthError({ type: "auth_required", message: error.message });
      }
    } finally {
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    checkUserAuth();
  }, []);

  const markOnboardingComplete = () => {
    try {
      if (user) {
        localStorage.setItem(getUserKey(user), "true");
      }
    } catch (error) {
      console.warn("[AuthContext] Could not save onboarding override:", error);
    }

    setOnboardingCompleteLocal(true);

    setUserProfile((prev) => ({
      ...(prev || {}),
      onboarding_status: "onboarding_completed",
      current_onboarding_step: 6,
      onboarding_completed_at: new Date().toISOString(),
    }));
  };

  const refreshUserProfile = async () => {
    if (!user) return null;

    const profile = await loadUserProfile(user);
    setUserProfile(profile);
    return profile;
  };

  const logout = async () => {
    try {
      localStorage.removeItem(getUserKey(user));
      localStorage.removeItem("base44_session_start");
    } catch {}

    setUser(null);
    setUserProfile(null);
    setAuthError(null);
    setOnboardingCompleteLocal(false);
    setAuthChecked(true);
    setIsLoadingAuth(false);

    try {
      await base44.auth.logout("/");
    } catch (error) {
      console.warn("[AuthContext] Logout failed:", error);
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
        authChecked,
        authError,
        needsOnboarding,
        isLoadingPublicSettings: false,
        checkUserAuth,
        refreshAuth: checkUserAuth,
        refreshUserProfile,
        markOnboardingComplete,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}