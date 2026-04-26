import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, FlaskConical, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const BETA_INVITE_CODE = 'BETA2025';

export default function Signup() {
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState('');

  const params = new URLSearchParams(window.location.search);
  const authErrorParam = params.get('error');
  const duplicateAccountError = authErrorParam === 'email_exists' || authErrorParam === 'user_already_exists';

  const handleSignup = () => {
    setInviteError('');
    const code = inviteInput.trim().toUpperCase();

    if (code && code !== BETA_INVITE_CODE) {
      setInviteError('Invalid invite code');
      return;
    }

    if (code === BETA_INVITE_CODE) {
      sessionStorage.setItem('beta_invite_code', BETA_INVITE_CODE);
    }

    base44.auth.redirectToLogin('/onboarding');
  };

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

          {duplicateAccountError && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                An account already exists for this email. Sign in instead.
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Invite Code (optional)</label>
            <input
              type="text"
              value={inviteInput}
              onChange={(event) => {
                setInviteInput(event.target.value);
                setInviteError('');
              }}
              placeholder="Enter code if you have one"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
            />

            {inviteInput.trim().toUpperCase() === BETA_INVITE_CODE && (
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 mt-2">
                <FlaskConical size={14} className="text-violet-600" />
                <p className="text-xs text-violet-700">Valid beta invite code.</p>
              </div>
            )}

            {inviteError && <p className="text-xs text-destructive mt-1">{inviteError}</p>}
          </div>

          <button
            type="button"
            onClick={handleSignup}
            className="w-full min-h-touch rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
          >
            Create account
          </button>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
