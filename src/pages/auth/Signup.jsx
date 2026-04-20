import { Droplets, FlaskConical } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Signup() {
  // Preserve invite code through the auth redirect by storing in sessionStorage
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');

  const handleSignup = () => {
    if (inviteCode) {
      sessionStorage.setItem('beta_invite_code', inviteCode.trim().toUpperCase());
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

        {/* Beta invite banner */}
        {inviteCode && (
          <div className="flex items-center gap-2.5 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-4">
            <FlaskConical size={16} className="text-violet-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-violet-800">Beta invite detected</p>
              <p className="text-xs text-violet-700 mt-0.5">
                Code <code className="font-mono font-bold">{inviteCode}</code> will be applied automatically on signup.
              </p>
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h2 className="text-xl font-semibold font-display mb-1">Create an account</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {inviteCode ? 'You have a beta invite — create your account to activate it.' : 'Start your free trial today'}
          </p>

          <button
            onClick={handleSignup}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
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