import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, ArrowLeft, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (err) => {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const msg = err.message || '';
    if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no user')) {
      return 'No account found for this email.';
    }
    return msg || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
};

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.forgotPassword(normalized);
    } catch {
      // Intentionally swallow — never reveal whether email exists
    } finally {
      setLoading(false);
      setSent(true); // Always show confirmation regardless of outcome
    }
  };

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
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <h2 className="text-xl font-semibold font-display mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-6">
                If <strong>{email.trim().toLowerCase()}</strong> is registered, a password reset link has been sent. Check your inbox and spam folder.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
              >
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold font-display mb-1">Reset your password</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {getErrorMessage(error)}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                    placeholder="you@company.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}