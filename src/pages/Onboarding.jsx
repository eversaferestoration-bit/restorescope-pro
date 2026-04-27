import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

import { Droplets, CheckCircle2 } from "lucide-react";
import OnboardingProgressBar from "@/components/onboarding/OnboardingProgressBar";
import Step1Welcome from "@/components/onboarding/Step1Welcome";
import Step2Company from "@/components/onboarding/Step2Company";
import Step3Role from "@/components/onboarding/Step3Role";
import Step4Pricing from "@/components/onboarding/Step4Pricing";
import Step5FirstJob from "@/components/onboarding/Step5FirstJob";

const DEFAULT_PRICING_LINE_ITEMS = [
  { category: "extraction", description: "Water extraction", unit: "sqft", unit_cost: 0.35 },
  { category: "drying", description: "Structural drying", unit: "day", unit_cost: 125 },
  { category: "containment", description: "Containment setup", unit: "lf", unit_cost: 4.5 },
  { category: "demolition", description: "Drywall removal", unit: "sqft", unit_cost: 1.75 },
  { category: "cleaning", description: "Antimicrobial treatment", unit: "sqft", unit_cost: 0.55 },
  { category: "hepa", description: "HEPA air scrubber", unit: "day", unit_cost: 85 },
  { category: "documentation", description: "Moisture documentation", unit: "hr", unit_cost: 65 },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, markOnboardingComplete } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [savedToast, setSavedToast] = useState(false);
  const [betaActivated, setBetaActivated] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    phone: "",
    email: "",
    service_area: "",
    logo_url: "",
  });

  const [role, setRole] = useState("admin");
  const [pricingChoice, setPricingChoice] = useState("");
  const [grantBeta, setGrantBeta] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [userProfileId, setUserProfileId] = useState(null);

  const showSaved = () => {
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2500);
  };

  const getUserEmail = () => user?.email || form.email || "";
  const getUserId = () => user?.id || user?.email || "";
  const getOnboardingKey = () => `rs_onboarding_complete_${user?.id || user?.email || "current_user"}`;

  const safeFilter = async (entity, filter) => {
    try {
      const result = await entity.filter(filter);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn("[Onboarding] Filter failed:", error?.message || error);
      return [];
    }
  };

  const safeUpdate = async (entity, id, data) => {
    if (!id) return null;

    try {
      return await entity.update(id, data);
    } catch (error) {
      console.warn("[Onboarding] Update failed:", error?.message || error);
      return null;
    }
  };

  const autosave = useCallback(
    async (stepNum, statusKey) => {
      if (!userProfileId) return;

      const saved = await safeUpdate(base44.entities.UserProfile, userProfileId, {
        current_onboarding_step: stepNum,
        onboarding_status: statusKey,
      });

      if (saved) showSaved();
    },
    [userProfileId]
  );

  useEffect(() => {
    let mounted = true;

    async function resumeOnboarding() {
      if (!user) {
        if (mounted) setInitializing(false);
        return;
      }

      try {
        const userId = getUserId();
        const email = getUserEmail();

        let profiles = [];

        if (userId) {
          profiles = await safeFilter(base44.entities.UserProfile, {
            user_id: userId,
            is_deleted: false,
          });
        }

        if (profiles.length === 0 && email) {
          profiles = await safeFilter(base44.entities.UserProfile, {
            email,
            is_deleted: false,
          });
        }

        if (!mounted) return;

        if (profiles.length > 0) {
          const profile = profiles[0];

          setUserProfileId(profile.id || null);
          setCompanyId(profile.company_id || null);
          setRole(profile.role || "admin");

          const savedStep = Number(profile.current_onboarding_step || 1);
          setStep(savedStep >= 1 && savedStep <= 5 ? savedStep : 1);

          if (profile.company_id) {
            const companies = await safeFilter(base44.entities.Company, {
              id: profile.company_id,
              is_deleted: false,
            });

            const pricingProfiles = await safeFilter(base44.entities.PricingProfile, {
              company_id: profile.company_id,
              is_deleted: false,
            });

            if (!mounted) return;

            if (companies.length > 0) {
              const company = companies[0];

              setForm({
                company_name: company.name || "",
                phone: company.phone || "",
                email: company.email || email || "",
                service_area: company.city || company.service_area || "",
                logo_url: company.logo_url || "",
              });
            }

            if (pricingProfiles.length > 0) {
              setPricingChoice("recommended");
            }
          }
        } else {
          setForm((prev) => ({
            ...prev,
            email: prev.email || email || "",
          }));
        }
      } catch (error) {
        console.error("[Onboarding] Resume failed:", error?.message || error);
      } finally {
        if (mounted) setInitializing(false);
      }
    }

    resumeOnboarding();

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.email]);

  const activateBetaIfNeeded = async (cId) => {
    try {
      const inviteCode = sessionStorage.getItem("beta_invite_code");
      const shouldUseInvite = inviteCode === "BETA2025";

      let shouldActivate = grantBeta || shouldUseInvite;

      if (!shouldActivate) {
        const allCompanies = await safeFilter(base44.entities.Company, {
          is_deleted: false,
        });

        shouldActivate = allCompanies.length <= 10;
      }

      if (!shouldActivate) return;

      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + 14);

      await safeUpdate(base44.entities.Company, cId, {
        is_beta_user: true,
        beta_start_date: start.toISOString().split("T")[0],
        beta_end_date: end.toISOString().split("T")[0],
        beta_status: "active",
      });

      if (shouldUseInvite) {
        sessionStorage.removeItem("beta_invite_code");
      }

      setBetaActivated(true);
    } catch (error) {
      console.warn("[Onboarding] Beta activation failed:", error?.message || error);
    }
  };

  const ensureCompanyAndProfile = async () => {
    const email = getUserEmail();
    const userId = getUserId();

    if (!userId && !email) {
      throw new Error("Missing authenticated user.");
    }

    let cId = companyId;
    let pId = userProfileId;

    if (!cId) {
      const company = await base44.entities.Company.create({
        name: form.company_name.trim(),
        phone: form.phone || "",
        email: form.email || email || "",
        city: form.service_area || "",
        service_area: form.service_area || "",
        logo_url: form.logo_url || "",
        status: "active",
        created_by: email || userId,
        is_deleted: false,
      });

      cId = company.id;
      setCompanyId(cId);
    } else {
      await base44.entities.Company.update(cId, {
        name: form.company_name.trim(),
        phone: form.phone || "",
        email: form.email || email || "",
        city: form.service_area || "",
        service_area: form.service_area || "",
        logo_url: form.logo_url || "",
        status: "active",
        is_deleted: false,
      });
    }

    if (!pId) {
      const existingProfilesByUser = userId
        ? await safeFilter(base44.entities.UserProfile, {
            user_id: userId,
            is_deleted: false,
          })
        : [];

      const existingProfilesByEmail =
        existingProfilesByUser.length === 0 && email
          ? await safeFilter(base44.entities.UserProfile, {
              email,
              is_deleted: false,
            })
          : [];

      const existingProfile = existingProfilesByUser[0] || existingProfilesByEmail[0];

      if (existingProfile?.id) {
        pId = existingProfile.id;
        setUserProfileId(pId);

        await base44.entities.UserProfile.update(pId, {
          user_id: existingProfile.user_id || userId,
          company_id: cId,
          email: existingProfile.email || email,
          role: existingProfile.role || "admin",
          current_onboarding_step: 3,
          onboarding_status: "company_completed",
          is_deleted: false,
        });
      } else {
        const profile = await base44.entities.UserProfile.create({
          user_id: userId,
          company_id: cId,
          email,
          role: "admin",
          current_onboarding_step: 3,
          onboarding_status: "company_completed",
          completed_steps: [1, 2],
          is_deleted: false,
        });

        pId = profile.id;
        setUserProfileId(pId);
      }
    } else {
      await base44.entities.UserProfile.update(pId, {
        company_id: cId,
        email,
        current_onboarding_step: 3,
        onboarding_status: "company_completed",
        is_deleted: false,
      });
    }

    return { cId, pId };
  };

  const handleStep1Continue = () => {
    setError("");
    setStep(2);
  };

  const handleStep2Continue = async () => {
    if (!form.company_name.trim()) {
      setError("Company name is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { cId } = await ensureCompanyAndProfile();
      await activateBetaIfNeeded(cId);
      showSaved();
      setStep(3);
    } catch (error) {
      console.error("[Onboarding] Step 2 failed:", error?.message || error);
      setError("Could not save company. Check required fields and permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Continue = async () => {
    setLoading(true);
    setError("");

    try {
      if (userProfileId) {
        await base44.entities.UserProfile.update(userProfileId, {
          role,
          current_onboarding_step: 4,
          onboarding_status: "role_selected",
        });

        showSaved();
      }

      setStep(4);
    } catch (error) {
      console.warn("[Onboarding] Role save failed:", error?.message || error);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const handleStep4Continue = async () => {
    setLoading(true);
    setError("");

    try {
      if (pricingChoice === "recommended" && companyId) {
        const existing = await safeFilter(base44.entities.PricingProfile, {
          company_id: companyId,
          is_deleted: false,
        });

        if (existing.length === 0) {
          await base44.entities.PricingProfile.create({
            company_id: companyId,
            name: "Water & Mold Mitigation Defaults",
            description: "Default water mitigation and mold remediation pricing profile.",
            is_default: true,
            line_items: DEFAULT_PRICING_LINE_ITEMS,
            is_deleted: false,
          });
        }
      }

      await autosave(5, "pricing_profile_set");
      setStep(5);
    } catch (error) {
      console.warn("[Onboarding] Pricing save failed:", error?.message || error);
      setStep(5);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    const key = getOnboardingKey();

    try {
      localStorage.setItem(key, "true");
    } catch (error) {
      console.warn("[Onboarding] Local onboarding save failed:", error?.message || error);
    }

    try {
      const email = getUserEmail();
      const userId = getUserId();

      let pId = userProfileId;

      if (!pId) {
        const profilesByUser = userId
          ? await safeFilter(base44.entities.UserProfile, {
              user_id: userId,
              is_deleted: false,
            })
          : [];

        const profilesByEmail =
          profilesByUser.length === 0 && email
            ? await safeFilter(base44.entities.UserProfile, {
                email,
                is_deleted: false,
              })
            : [];

        const profile = profilesByUser[0] || profilesByEmail[0];

        if (profile?.id) {
          pId = profile.id;
          setUserProfileId(pId);
        }
      }

      if (pId) {
        await base44.entities.UserProfile.update(pId, {
          onboarding_status: "onboarding_completed",
          onboarding_completed_at: new Date().toISOString(),
          current_onboarding_step: 6,
          is_deleted: false,
        });
      }
    } catch (error) {
      console.warn("[Onboarding] DB completion save failed. Local override will continue:", error?.message || error);
    }

    markOnboardingComplete();
  };

  const handleCreateFirstJob = async () => {
    setLoading(true);
    setError("");

    try {
      await completeOnboarding();
      navigate("/jobs/new", { replace: true });
    } catch (error) {
      console.warn("[Onboarding] Create first job fallback:", error?.message || error);
      try {
        localStorage.setItem(getOnboardingKey(), "true");
      } catch {}
      markOnboardingComplete();
      navigate("/jobs/new", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setError("");

    try {
      await completeOnboarding();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.warn("[Onboarding] Skip fallback:", error?.message || error);
      try {
        localStorage.setItem(getOnboardingKey(), "true");
      } catch {}
      markOnboardingComplete();
      navigate("/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const showProgress = step >= 2 && step <= 4;
  const progressStep = step - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Droplets size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold font-display">RestoreScope Pro</span>
        </div>

        {step > 1 && step < 5 && (
          <span className="text-xs text-muted-foreground">Step {step - 1} of 4</span>
        )}
      </div>

      <div
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg shadow-md text-xs font-medium text-green-700 transition-all duration-300 ${
          savedToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <CheckCircle2 size={13} className="text-green-600" />
        Progress saved
      </div>

      <div
        className={`fixed top-16 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-300 rounded-lg shadow-md text-xs font-semibold text-violet-800 transition-all duration-500 ${
          betaActivated ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        Beta access activated
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-[420px]">
          {showProgress && <OnboardingProgressBar currentStep={progressStep} totalSteps={4} />}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
            {step === 1 && (
              <Step1Welcome
                userName={user?.full_name || user?.name || user?.email}
                onContinue={handleStep1Continue}
              />
            )}

            {step === 2 && (
              <Step2Company
                form={form}
                setForm={setForm}
                onBack={() => setStep(1)}
                onContinue={handleStep2Continue}
                loading={loading}
                grantBeta={grantBeta}
                setGrantBeta={setGrantBeta}
                isAdmin={user?.role === "admin"}
              />
            )}

            {step === 3 && (
              <Step3Role
                selectedRole={role}
                setRole={setRole}
                onBack={() => setStep(2)}
                onContinue={handleStep3Continue}
                loading={loading}
              />
            )}

            {step === 4 && (
              <Step4Pricing
                pricingChoice={pricingChoice}
                setPricingChoice={setPricingChoice}
                onBack={() => setStep(3)}
                onContinue={handleStep4Continue}
                loading={loading}
              />
            )}

            {step === 5 && (
              <Step5FirstJob
                onBack={() => setStep(4)}
                onCreateJob={handleCreateFirstJob}
                onSkip={handleSkip}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}