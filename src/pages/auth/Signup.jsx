import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, FlaskConical, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { normalizeEmail } from '@/lib/authRepair';

const BETA_INVITE_CODE = 'BETA2025';

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
  const [urlError] = useState(getUrlError);

  // Pre-fill invite code from URL param (e.g. from an invite link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) setInviteInput(code.toUpperCase());
  }, []);

  const handleSignup = () => {
    setInviteError('');
    const code = inviteInput.trim().toUpperCase();

    if (code && code !== BETA_INVITE_CODE) {
      setInviteError('Invalid invite code.');
      return;
    }

    if (code === BETA_INVITE_CODE) {
      sessionStorage.setItem('beta_invite_code', BETA_INVITE_CODE);
    }

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
            {inviteInput && inviteInput.trim().toUpperCase() === BETA_INVITE_CODE && (
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 mt-2">
                <FlaskConical size={14} className="text-violet-600" />
                <p className="text-xs text-violet-700">Valid beta invite code!</p>
              </div>
            )}
            {inviteError && <p className="text-xs text-destructive mt-1">{inviteError}</p>}
          </div>

          <button
            onClick={handleSignup}
            className="w-full min-h-touch rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
          >
            Create account
          </button>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            By signing up, you agree to our{' '}
            <span className="text-primary">Terms of Service</span> and{' '}
            <span className="text-primary">Privacy Policy</span>.
          </p>
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