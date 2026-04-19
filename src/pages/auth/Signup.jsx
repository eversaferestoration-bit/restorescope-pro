import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    
    // Real-time validation for password fields
    if (k === 'password' || k === 'confirm') {
      validatePasswords(k === 'password' ? value : form.password, k === 'confirm' ? value : form.confirm);
    }
  };

  const validatePasswords = (pwd, confirm) => {
    if (!pwd && !confirm) {
      setPasswordError('');
      return;
    }
    if (pwd && pwd.length < 8) {
      setPasswordError('Password must be at least 8 characters');
    } else if (pwd && confirm && pwd !== confirm) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  };

  const getSafeErrorMessage = (error) => {
    console.error('Signup error:', error);
    if (typeof error === 'object' && error !== null) {
      return error.message || 'Something went wrong. Please try again.';
    }
    return error || 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate password length
    if (form.password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    // Validate passwords match
    if (form.password !== form.confirm) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setPasswordError('');
    setLoading(true);
    try {
      await base44.auth.register(form.email, form.password, form.full_name);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(getSafeErrorMessage(err));
    } finally {
      setLoading(false);
    }
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

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm">
              {typeof error === 'string' ? error : 'Something went wrong. Please try again.'}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={set('full_name')}
                required
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Work email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                placeholder="Min. 8 characters"
              />
              {form.password && form.password.length < 8 && (
                <p className="text-xs text-destructive mt-1">Password must be at least 8 characters</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                required
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                placeholder="••••••••"
              />
              {form.confirm && form.password !== form.confirm && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !!passwordError || !form.password || !form.confirm}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            By signing up, you agree to our{' '}
            <span className="text-primary">Terms of Service</span> and{' '}
            <span className="text-primary">Privacy Policy</span>.
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