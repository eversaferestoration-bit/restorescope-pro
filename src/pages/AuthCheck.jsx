import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Droplets, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

const StatusItem = ({ label, status, error }) => (
  <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
    <div className="flex-1">
      <p className="text-sm font-medium">{label}</p>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
    {status === 'loading' ? (
      <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    ) : status === 'success' ? (
      <CheckCircle2 size={20} className="text-green-600" />
    ) : (
      <AlertCircle size={20} className="text-destructive" />
    )}
  </div>
);

export default function AuthCheck() {
  const navigate = useNavigate();
  const { user, accountState, isLoadingAuth } = useAuth();

  const [checks, setChecks] = useState({
    session: { status: 'loading', error: null },
    user: { status: 'loading', error: null },
    profile: { status: 'loading', error: null },
    company: { status: 'loading', error: null },
    onboarding: { status: 'loading', error: null },
  });

  const [userProfileData, setUserProfileData] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const runChecks = async () => {
    setIsRetrying(true);
    const newChecks = { ...checks };

    try {
      // Session check
      const isAuth = await base44.auth.isAuthenticated();
      newChecks.session = isAuth
        ? { status: 'success', error: null }
        : { status: 'error', error: 'Not authenticated' };

      if (!isAuth) {
        setChecks(newChecks);
        setIsRetrying(false);
        return;
      }

      // User check
      try {
        const currentUser = await base44.auth.me();
        newChecks.user = {
          status: 'success',
          error: null,
          data: { email: currentUser?.email, role: currentUser?.role, id: currentUser?.id },
        };
      } catch (e) {
        newChecks.user = { status: 'error', error: e?.message || 'Failed to load user' };
      }

      // UserProfile check
      if (user) {
        try {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
          if (profiles.length > 0) {
            const profile = profiles[0];
            setUserProfileData(profile);
            newChecks.profile = {
              status: 'success',
              error: null,
              data: { id: profile.id, company_id: profile.company_id },
            };

            // Company check
            if (profile.company_id) {
              try {
                const companies = await base44.entities.Company.filter({
                  id: profile.company_id,
                  is_deleted: false,
                });
                newChecks.company = companies.length > 0
                  ? { status: 'success', error: null, data: { id: profile.company_id } }
                  : { status: 'error', error: 'Company not found' };
              } catch (e) {
                newChecks.company = { status: 'error', error: e?.message || 'Failed to load company' };
              }
            } else {
              newChecks.company = { status: 'error', error: 'No company_id in profile' };
            }

            // Onboarding check
            const onboardingStatus = profile.onboarding_status;
            newChecks.onboarding = onboardingStatus === 'onboarding_completed'
              ? { status: 'success', error: null, data: { status: onboardingStatus } }
              : { status: 'error', error: `Status: ${onboardingStatus || 'not set'}` };
          } else {
            newChecks.profile = { status: 'error', error: 'No UserProfile found' };
            newChecks.company = { status: 'error', error: 'Skipped (no profile)' };
            newChecks.onboarding = { status: 'error', error: 'Skipped (no profile)' };
          }
        } catch (e) {
          newChecks.profile = { status: 'error', error: e?.message || 'Failed to load profile' };
          newChecks.company = { status: 'error', error: 'Skipped (profile failed)' };
          newChecks.onboarding = { status: 'error', error: 'Skipped (profile failed)' };
        }
      }

      setChecks(newChecks);
    } catch (e) {
      console.error('[AuthCheck] Unexpected error:', e);
    } finally {
      setIsRetrying(false);
    }
  };

  // Run checks on mount
  useEffect(() => {
    if (!isLoadingAuth) {
      runChecks();
    }
  }, [isLoadingAuth, user?.id]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Checking auth…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Droplets size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold font-display">RestoreScope Pro</span>
          </Link>
          <p className="text-xs text-muted-foreground">Auth Debug</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-display mb-1">Auth Status Check</h1>
          <p className="text-sm text-muted-foreground">Debug page to verify login state</p>
        </div>

        {/* Status cards */}
        <div className="bg-card rounded-xl border border-border mb-6">
          <StatusItem label="Session" {...checks.session} />
          <StatusItem label="User" {...checks.user} />
          <StatusItem label="UserProfile" {...checks.profile} />
          <StatusItem label="Company" {...checks.company} />
          <StatusItem label="Onboarding" {...checks.onboarding} />
        </div>

        {/* Actions */}
        <div className="space-y-2 mb-6">
          <button
            onClick={runChecks}
            disabled={isRetrying}
            className="w-full h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isRetrying ? (
              <><RefreshCw size={14} className="animate-spin" /> Checking…</>
            ) : (
              <><RefreshCw size={14} /> Retry</>
            )}
          </button>

          {checks.company.status === 'error' && (
            <button
              onClick={() => navigate('/onboarding')}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition flex items-center justify-center gap-2"
            >
              <ArrowRight size={14} /> Go to Company Setup
            </button>
          )}

          {checks.onboarding.status === 'error' &&
            checks.onboarding.error?.includes('account_created|company_started|company_completed|role_selected|pricing_profile_set') && (
              <button
                onClick={() => navigate('/onboarding')}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition flex items-center justify-center gap-2"
              >
                <ArrowRight size={14} /> Resume Onboarding
              </button>
            )}

          {checks.session.status === 'success' && checks.company.status === 'success' && checks.onboarding.status === 'success' && (
            <button
              onClick={() => {
                sessionStorage.removeItem('dashboard-ready');
                navigate('/dashboard');
              }}
              className="w-full h-10 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <ArrowRight size={14} /> Go to Dashboard
            </button>
          )}

          <Link
            to="/login"
            className="w-full h-10 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition flex items-center justify-center gap-2"
          >
            Back to Login
          </Link>
        </div>

        {/* Info box */}
        {userProfileData && (
          <div className="bg-muted/40 rounded-lg px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p><span className="font-semibold">User ID:</span> {userProfileData.user_id}</p>
            <p><span className="font-semibold">Company ID:</span> {userProfileData.company_id || 'not set'}</p>
            <p><span className="font-semibold">Status:</span> {userProfileData.onboarding_status}</p>
            <p><span className="font-semibold">Role:</span> {userProfileData.role}</p>
          </div>
        )}
      </main>
    </div>
  );
}