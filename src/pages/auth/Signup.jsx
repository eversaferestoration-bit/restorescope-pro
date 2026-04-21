import { useState } from 'react';
import { Droplets, FlaskConical, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { normalizeEmail } from '@/lib/authRepair';

const BETA_INVITE_CODE = 'BETA2025';

export default function Signup() {
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Check if redirected back with a duplicate account error — redirect to recovery page
  const params = new URLSearchParams(window.location.search);
  const authErrorParam = params.get('error');
  const duplicateAccountError =
    authErrorParam === 'email_exists' || authErrorParam === 'user_already_exists';

  // If duplicate email detected, immediately redirect to recovery flow
  if (duplicateAccountError) {
    window.location.replace('/account-recovery?reason=existing_email');
  }

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

    // Normalize any stored email context before redirecting
    const storedEmail = sessionStorage.getItem('signup_email');
    if (storedEmail) {
      const normalized = normalizeEmail(storedEmail);
      console.log('[Signup] Normalized email before redirect:', normalized);
      sessionStorage.setItem('signup_email', normalized);
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
          <div>
            <p className="text-lg font-bold font-display leading-tight">RestoreScope Pro</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h2 className="text-xl font-semibold font-display mb-1">Create an account</h2>
          <p className="text-sm text-muted-foreground mb-6">Start your free trial today</p>

          {/* Duplicate account error message */}
          {duplicateAccountError && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                An account already exists for this email. Try{' '}
                <button
                  onClick={() => base44.auth.redirectToLogin('/dashboard')}
                  className="font-semibold underline"
                >
                  signing in
                </button>
                {' '}or{' '}
                <button
                  onClick={() => base44.auth.redirectToLogin('/dashboard')}
                  className="font-semibold underline"
                >
                  reset your password
                </button>
                .
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Invite Code (optional)</label>
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => {
                setInviteInput(e.target.value);
                setInviteError('');
              }}
              placeholder="Enter code if you have one"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
            {inviteInput && inviteInput.trim().toUpperCase() === BETA_INVITE_CODE && (
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 mt-2">
                <FlaskConical size={14} className="text-violet-600" />
                <p className="text-xs text-violet-700">Valid beta invite code!</p>
              </div>
            )}
            {inviteError && (
              <p className="text-xs text-destructive mt-1">{inviteError}</p>
            )}
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
            className="text-primary font-medium hover:underline touch-target"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}