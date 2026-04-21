/**
 * AccountRecovery page
 * Shown when a user lands in a partial account state:
 *   - auth exists but no UserProfile
 *   - auth exists but no Company
 *   - onboarding incomplete
 * Also shown when a signup retry detects an existing auth email.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { normalizeEmail, repairMissingUserProfile } from '@/lib/authRepair';
import { Droplets, AlertCircle, RefreshCw, ArrowRight, LogIn } from 'lucide-react';

const STATE = {
  CHECKING: 'checking',
  NO_PROFILE_NO_COMPANY: 'no_profile_no_company',
  NO_PROFILE_HAS_COMPANY: 'no_profile_has_company',
  ONBOARDING_INCOMPLETE: 'onboarding_incomplete',
  EXISTING_EMAIL: 'existing_email',
  OK: 'ok',
};

export default function AccountRecovery() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState(STATE.CHECKING);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Check if we arrived here due to a duplicate signup attempt
  const params = new URLSearchParams(window.location.search);
  const isExistingEmailFlow = params.get('reason') === 'existing_email';

  useEffect(() => {
    if (isExistingEmailFlow) {
      setState(STATE.EXISTING_EMAIL);
      return;
    }
    if (!user) return;
    diagnose();
  }, [user?.id]);

  const diagnose = async () => {
    setState(STATE.CHECKING);
    setError('');
    try {
      const email = normalizeEmail(user?.email || '');
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });

      if (profiles.length === 0) {
        // No profile — check for existing company by email
        const companies = await base44.entities.Company.filter({ created_by: email, is_deleted: false });
        if (companies.length > 0) {
          setState(STATE.NO_PROFILE_HAS_COMPANY);
        } else {
          setState(STATE.NO_PROFILE_NO_COMPANY);
        }
        return;
      }

      const profile = profiles[0];
      const INCOMPLETE = ['account_created', 'company_started', 'company_completed', 'role_selected', 'pricing_profile_set'];
      if (INCOMPLETE.includes(profile.onboarding_status)) {
        setState(STATE.ONBOARDING_INCOMPLETE);
        return;
      }

      // Profile exists and completed — no recovery needed
      setState(STATE.OK);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError('Could not check account state. Please try again.');
      setState(STATE.NO_PROFILE_NO_COMPANY);
    }
  };

  const handleRepairAndResume = async () => {
    setRepairing(true);
    setError('');
    setRetryCount(retryCount + 1);
    try {
      const email = normalizeEmail(user?.email || '');
      const companies = await base44.entities.Company.filter({ created_by: email, is_deleted: false });
      if (companies.length > 0) {
        const repaired = await repairMissingUserProfile(user, companies[0]);
        if (repaired) {
          // Clear retry count and go to dashboard
          setRetryCount(0);
          setTimeout(() => navigate('/dashboard', { replace: true }), 500);
          return;
        }
      }
      // No company found either — start fresh onboarding
      setRetryCount(0);
      setTimeout(() => navigate('/onboarding', { replace: true }), 500);
    } catch (e) {
      setError('Repair failed. Please try again or contact support.');
    } finally {
      setRepairing(false);
    }
  };

  const handleResumeOnboarding = () => {
    setRetryCount(0);
    navigate('/onboarding', { replace: true });
  };
  const handleSignIn = () => {
    // Only logout if user explicitly chooses to sign back in
    logout();
    setTimeout(() => base44.auth.redirectToLogin('/dashboard'), 300);
  };
  const handleResetPassword = () => navigate('/forgot-password');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Droplets size={20} className="text-white" />
          </div>
          <p className="text-lg font-bold font-display">RestoreScope Pro</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5">
          {state === STATE.CHECKING && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Checking your account…</p>
            </div>
          )}

          {state === STATE.EXISTING_EMAIL && (
            <>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold font-display text-base">Account already exists</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    An account already exists for this email. Sign in to access your existing account, or reset your password if you've forgotten it.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleSignIn}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
                >
                  <LogIn size={15} /> Sign in to existing account
                </button>
                <button
                  onClick={handleResetPassword}
                  className="w-full h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
                >
                  Reset my password
                </button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Your session is active. No need to sign in again.
              </p>
            </>
          )}

          {state === STATE.NO_PROFILE_HAS_COMPANY && (
            <>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold font-display text-base">Login succeeded, account needs repair</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your company was found but your profile record is missing. We can repair this automatically.
                  </p>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {retryCount > 2 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Repair has been attempted {retryCount} times. If this continues, please contact support.
                </p>
              )}
              <div className="space-y-2">
                <button
                  onClick={handleRepairAndResume}
                  disabled={repairing}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {repairing ? <><RefreshCw size={14} className="animate-spin" /> Repairing…</> : <><RefreshCw size={14} /> Retry Repair</>}
                </button>
                <button
                  onClick={handleResumeOnboarding}
                  className="w-full h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition flex items-center justify-center gap-2"
                >
                  <ArrowRight size={14} /> Continue to Setup
                </button>
              </div>
              <p className="text-center text-xs text-muted-foreground">Your session is active.</p>
            </>
          )}

          {state === STATE.NO_PROFILE_NO_COMPANY && (
            <>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold font-display text-base">Setup incomplete</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your account exists but setup was never completed. Let's finish setting up your company.
                  </p>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                onClick={handleResumeOnboarding}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
              >
                <ArrowRight size={15} /> Complete setup
              </button>
            </>
          )}

          {state === STATE.ONBOARDING_INCOMPLETE && (
            <>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold font-display text-base">Finish your setup</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your account setup was started but not completed. Resume where you left off.
                  </p>
                </div>
              </div>
              <button
                onClick={handleResumeOnboarding}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
              >
                <ArrowRight size={15} /> Resume setup
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Need help?{' '}
          <a href="mailto:support@restorescope.com" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}