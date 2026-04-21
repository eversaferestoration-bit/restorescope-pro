import { useAuth } from '@/lib/AuthContext';
import { AlertTriangle, Home, Plus, CheckSquare, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardSafeMode({ onRetry, userProfileId, onboardingStatus }) {
  const { user } = useAuth();

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pt-12">
      {/* Error banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="font-semibold text-amber-900">Some dashboard data could not be loaded.</h2>
          <p className="text-sm text-amber-800 mt-1">We're showing a simplified view while we recover. Try refreshing your page or check back in a moment.</p>
        </div>
      </div>

      {/* Welcome section */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Home size={18} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold font-display">
            Welcome back, {user?.full_name ? user.full_name.split(' ')[0] : 'there'}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Your account is set up and ready to use. Get started with your first job or continue where you left off.
        </p>
      </div>

      {/* Account status */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Account</p>
          <p className="text-sm font-semibold text-green-700">Active</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <p className="text-sm font-semibold text-green-700">Ready</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2 mb-6">
        <Link
          to="/jobs/new"
          className="w-full flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
        >
          <Plus size={15} /> Create Your First Job
        </Link>

        {onboardingStatus && onboardingStatus !== 'onboarding_completed' && (
          <Link
            to="/onboarding"
            className="w-full flex items-center justify-center gap-2 px-4 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
          >
            <CheckSquare size={15} /> Continue Setup
          </Link>
        )}

        <Link
          to="/jobs"
          className="w-full flex items-center justify-center gap-2 px-4 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
        >
          View All Jobs
        </Link>
      </div>

      {/* Retry button */}
      <button
        onClick={onRetry}
        className="w-full flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition"
      >
        <RefreshCw size={14} /> Try Again
      </button>
    </div>
  );
}