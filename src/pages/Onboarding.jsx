import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Droplets, CheckCircle2 } from 'lucide-react';
import OnboardingProgressBar from '@/components/onboarding/OnboardingProgressBar';
import Step1Welcome from '@/components/onboarding/Step1Welcome';
import Step2Company from '@/components/onboarding/Step2Company';
import Step3Role from '@/components/onboarding/Step3Role';
import Step4Pricing from '@/components/onboarding/Step4Pricing';
import Step5FirstJob from '@/components/onboarding/Step5FirstJob';

const DEFAULT_PRICING_LINE_ITEMS = [
  { category: 'extraction', description: 'Water extraction', unit: 'sqft', unit_cost: 0.35 },
  { category: 'drying', description: 'Structural drying (per day)', unit: 'day', unit_cost: 125 },
  { category: 'containment', description: 'Containment setup', unit: 'lf', unit_cost: 4.5 },
  { category: 'demolition', description: 'Drywall removal', unit: 'sqft', unit_cost: 1.75 },
  { category: 'cleaning', description: 'Antimicrobial treatment', unit: 'sqft', unit_cost: 0.55 },
  { category: 'hepa', description: 'HEPA air scrubber (per day)', unit: 'day', unit_cost: 85 },
  { category: 'documentation', description: 'Moisture documentation', unit: 'hr', unit_cost: 65 },
];

// Maps internal step number to onboarding_status value
const STEP_STATUS = {
  1: 'account_created',
  2: 'company_started',
  3: 'company_completed',
  4: 'role_selected',
  5: 'pricing_profile_set',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');
  const [savedToast, setSavedToast] = useState(false);
  const [betaActivated, setBetaActivated] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    phone: '',
    email: '',
    service_area: '',
    logo_url: '',
  });
  const [role, setRole] = useState('admin');
  const [pricingChoice, setPricingChoice] = useState('');
  const [grantBeta, setGrantBeta] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [userProfileId, setUserProfileId] = useState(null);

  // Show autosave toast briefly
  const showSaved = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  // Autosave step to UserProfile
  const autosave = useCallback(async (stepNum, statusKey) => {
    if (!userProfileId) return;
    try {
      await base44.entities.UserProfile.update(userProfileId, {
        current_onboarding_step: stepNum,
        onboarding_status: statusKey,
      });
      showSaved();
    } catch (e) { /* silent */ }
  }, [userProfileId]);

  // Save progress before tab close
  useEffect(() => {
    const handleUnload = () => {
      if (userProfileId && step > 1 && step < 5) {
        navigator.sendBeacon && navigator.sendBeacon('/api/noop'); // trigger unload
        // Best-effort: autosave won't await here, but state is already persisted from previous saves
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [userProfileId, step]);

  // Resume on mount
  useEffect(() => {
    if (!user) return;
    const resume = async () => {
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
        if (profiles.length > 0) {
          const profile = profiles[0];
          setUserProfileId(profile.id);
          setCompanyId(profile.company_id);

          if (profile.onboarding_status === 'onboarding_completed') {
            navigate('/dashboard', { replace: true });
            return;
          }

          // Resume at saved step, minimum step 1, maximum step 5
          const savedStep = profile.current_onboarding_step || 1;
          setStep(Math.min(Math.max(savedStep, 1), 5));
          setRole(profile.role || 'admin');

          if (profile.company_id) {
            const [companies, pricingProfiles] = await Promise.all([
              base44.entities.Company.filter({ id: profile.company_id, is_deleted: false }),
              base44.entities.PricingProfile.filter({ company_id: profile.company_id, is_deleted: false }),
            ]);
            if (companies.length > 0) {
              const co = companies[0];
              setForm({
                company_name: co.name || '',
                phone: co.phone || '',
                email: co.email || user?.email || '',
                service_area: co.city || '',
                logo_url: co.logo_url || '',
              });
            }
            // Pre-fill pricing choice if profile already exists (resume case)
            if (pricingProfiles.length > 0) {
              setPricingChoice('recommended');
            }
          }
        } else {
          // No profile found — user is in signup but hasn't completed onboarding
          console.log('[Onboarding] No profile found — starting fresh onboarding');
        }
      } catch (e) {
        console.error('[Onboarding] Resume failed:', e?.message);
        /* start fresh */
      }
      finally { setInitializing(false); }
    };
    resume();
  }, [user?.id]);

  // Step 1 → 2
  const handleStep1Continue = () => {
    setStep(2);
    // No profile exists yet at step 1 — autosave happens when company is created in step 2
  };

  // Step 2 → 3: create/update company
  const handleStep2Continue = async () => {
    if (!form.company_name.trim()) return;
    setLoading(true);
    setError('');
    try {
      let cId = companyId;
      if (!cId) {
        // Create company
        const companyData = {
          name: form.company_name.trim(),
          phone: form.phone || undefined,
          email: form.email || user?.email,
          city: form.service_area || undefined,
          logo_url: form.logo_url || undefined,
          status: 'active',
          created_by: user?.email,
          is_deleted: false,
        };

        // Add beta fields if admin manually selected the toggle
        if (grantBeta) {
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 14);
          companyData.is_beta_user = true;
          companyData.beta_start_date = startDate.toISOString().split('T')[0];
          companyData.beta_end_date = endDate.toISOString().split('T')[0];
          companyData.beta_status = 'active';
        }

        const company = await base44.entities.Company.create(companyData);
        cId = company.id;
        setCompanyId(cId);

        // Auto-activate beta for first 10 companies (if not already set by admin)
        if (!grantBeta) {
          const allCompanies = await base44.asServiceRole.entities.Company.filter({ is_deleted: false });
          if (allCompanies.length <= 10) {
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 14);
            await base44.asServiceRole.entities.Company.update(cId, {
              is_beta_user: true,
              beta_start_date: startDate.toISOString().split('T')[0],
              beta_end_date: endDate.toISOString().split('T')[0],
              beta_status: 'active',
            });
            setBetaActivated(true);
          }
        }

        // Apply beta access if invite code was stored during signup
        const inviteCode = sessionStorage.getItem('beta_invite_code');
        if (inviteCode === 'BETA2025') {
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 14);
          await base44.asServiceRole.entities.Company.update(cId, {
            is_beta_user: true,
            beta_start_date: startDate.toISOString().split('T')[0],
            beta_end_date: endDate.toISOString().split('T')[0],
            beta_status: 'active',
          });
          sessionStorage.removeItem('beta_invite_code');
          setBetaActivated(true);
        }

        // Pick up legal acceptance stored during signup
        const legalAcceptedAt = sessionStorage.getItem('legal_accepted_at');

        const profile = await base44.entities.UserProfile.create({
          user_id: user.id,
          company_id: cId,
          email: user.email,
          role: 'admin',
          current_onboarding_step: 3,
          onboarding_status: 'company_completed',
          completed_steps: [1, 2],
          accepted_terms: !!legalAcceptedAt,
          accepted_privacy_policy: !!legalAcceptedAt,
          legal_accepted_at: legalAcceptedAt || undefined,
          is_deleted: false,
        });
        if (legalAcceptedAt) sessionStorage.removeItem('legal_accepted_at');
        setUserProfileId(profile.id);
        showSaved();
      } else {
        await base44.entities.Company.update(cId, {
          name: form.company_name.trim(),
          phone: form.phone || undefined,
          email: form.email || undefined,
          city: form.service_area || undefined,
          logo_url: form.logo_url || undefined,
        });
        await autosave(3, 'company_completed');
      }
      setStep(3);
    } catch (e) {
      setError('Could not save company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 → 4: save role
  const handleStep3Continue = async () => {
    setLoading(true);
    try {
      if (userProfileId) {
        await base44.entities.UserProfile.update(userProfileId, {
          role,
          current_onboarding_step: 4,
          onboarding_status: 'role_selected',
        });
        showSaved();
      }
      setStep(4);
    } catch (e) {
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  // Step 4 → 5: create pricing profile
  const handleStep4Continue = async () => {
    setLoading(true);
    try {
      if (pricingChoice === 'recommended' && companyId) {
        const existing = await base44.entities.PricingProfile.filter({ company_id: companyId, is_deleted: false });
        if (existing.length === 0) {
          await base44.entities.PricingProfile.create({
            company_id: companyId,
            name: 'Recommended Defaults',
            description: 'Industry-standard restoration pricing',
            is_default: true,
            line_items: DEFAULT_PRICING_LINE_ITEMS,
            is_deleted: false,
          });
        }
      }
      await autosave(5, 'pricing_profile_set');
      setStep(5);
    } catch (e) {
      setStep(5);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: create first job — mark onboarding complete so ProtectedRoute never loops back
  const handleCreateFirstJob = async () => {
    try {
      if (userProfileId) {
        await base44.entities.UserProfile.update(userProfileId, {
          onboarding_status: 'onboarding_completed',
          onboarding_completed_at: new Date().toISOString(),
          current_onboarding_step: 6,
        });
      }
    } catch (e) { /* silent */ }
    navigate('/jobs/new', { replace: true });
  };

  // Step 5: skip to dashboard
  const handleSkip = async () => {
    try {
      if (userProfileId) {
        await base44.entities.UserProfile.update(userProfileId, {
          onboarding_status: 'onboarding_completed',
          onboarding_completed_at: new Date().toISOString(),
          current_onboarding_step: 6,
        });
      }
    } catch (e) { /* silent */ }
    navigate('/dashboard', { replace: true });
  };

  if (initializing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Steps 2–4 show progress bar (step 1 = welcome, step 5 = final CTA)
  const showProgress = step >= 2 && step <= 4;
  // Map outer step (1–5) to progress bar step (1–4 maps to 4 real steps)
  const progressStep = step - 1; // 2→1, 3→2, 4→3, 5→4

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Brand header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Droplets size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold font-display">RestoreScope Pro</span>
        </div>
        {step > 1 && step < 5 && (
          <span className="text-xs text-muted-foreground">
            Step {step - 1} of 4
          </span>
        )}
      </div>

      {/* Autosave toast */}
      <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg shadow-md text-xs font-medium text-green-700 transition-all duration-300 ${savedToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <CheckCircle2 size={13} className="text-green-600" /> Progress saved
      </div>

      {/* Beta activated toast */}
      <div className={`fixed top-16 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-300 rounded-lg shadow-md text-xs font-semibold text-violet-800 transition-all duration-500 ${betaActivated ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        🧪 Beta access activated!
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-[420px]">

          {showProgress && (
            <OnboardingProgressBar currentStep={progressStep} totalSteps={4} />
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
            {step === 1 && (
              <Step1Welcome userName={user?.full_name} onContinue={handleStep1Continue} />
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
                isAdmin={user?.role === 'admin'}
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
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}