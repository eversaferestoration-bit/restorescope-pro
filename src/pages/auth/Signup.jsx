import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { normalizeEmail } from '@/lib/authRepair';

// Parse error from URL (platform posts these after failed OAuth flows)
function getUrlError() {
  const params = new URLSearchParams(window.location.search);
  const err = params.get('error');
  if (!err) return null;
  if (err === 'email_exists' || err === 'user_already_exists') return 'duplicate_email';
  return null;
}

export default function Signup() {
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [legalError, setLegalError] = useState('');
  const [urlError] = useState(getUrlError);

  const legalValid = termsAccepted && privacyAccepted;

  // Pre-fill invite code from URL param (e.g. from an invite link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) setInviteInput(code.toUpperCase());
  }, []);

  const handleSignup = async () => {
    setInviteError('');
    setLegalError('');

    if (!legalValid) {
      setLegalError('You must agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    const code = inviteInput.trim().toUpperCase();

    if (code) {
      // Validate invite code server-side
      try {
        const res = await base44.functions.invoke('validateBetaInvite', { code });
        if (!res.data?.valid) {
          setInviteError(res.data?.message || 'Invalid invite code.');
          return;
        }
        sessionStorage.setItem('beta_invite_code', code);
      } catch {
        setInviteError('Could not validate invite code. Please try again.');
        return;
      }
    }

    // Store legal acceptance in sessionStorage so Onboarding can save it to the profile
    sessionStorage.setItem('legal_accepted_at', new Date().toISOString());

    base44.auth.redirectToLogin('/onboarding');
  };

  // Duplicate email — user already has an account, prompt sign-in/reset
  if (urlError === 'duplicate_email') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Droplets size={20} className="text-white" />
            </div>
            <p className="text-lg font-bold font-display">RestoreScope Pro</p>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                <AlertCircle size={22} className="text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold font-display mb-1">Account already exists</h2>
              <p className="text-sm text-muted-foreground">
                An account with this email already exists.
              </p>
            </div>

            <div className="bg-muted/60 rounded-lg px-4 py-3 mb-5 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Don't know your password?</span>{' '}
              Use <Link to="/forgot-password" className="text-primary font-semibold hover:underline">Forgot password?</Link> to get a reset link sent to your email.
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => base44.auth.redirectToLogin('/dashboard')}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
              >
                Sign in to existing account
              </button>
              <Link
                to="/forgot-password"
                className="w-full h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition flex items-center justify-center"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Droplets size={20} className="text-white" />
          </div>
          <p className="text-lg font-bold font-display leading-tight">RestoreScope Pro</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h2 className="text-xl font-semibold font-display mb-1">Create an account</h2>
          <p className="text-sm text-muted-foreground mb-6">Start your free trial today</p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Invite Code (optional)</label>
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => { setInviteInput(e.target.value.toUpperCase()); setInviteError(''); }}
              placeholder="Enter code if you have one"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
            />

            {inviteError && <p className="text-xs text-destructive mt-1">{inviteError}</p>}
          </div>

          {/* Legal acceptance checkboxes */}
          <div className="space-y-2.5 mb-4">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => { setTermsAccepted(e.target.checked); setLegalError(''); }}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary shrink-0"
              />
              <span className="text-sm text-foreground">
                I agree to the{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                  Terms of Service
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => { setPrivacyAccepted(e.target.checked); setLegalError(''); }}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary shrink-0"
              />
              <span className="text-sm text-foreground">
                I agree to the{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>

            {legalError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle size={12} className="shrink-0" />
                {legalError}
              </p>
            )}
          </div>

          <button
            onClick={handleSignup}
            disabled={!legalValid}
            className="w-full min-h-touch rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create account
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Already have an account?{' '}
          <button
            onClick={() => base44.auth.redirectToLogin('/dashboard')}
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}