import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import UpgradePrompt from '@/components/UpgradePrompt';
import { FolderOpen, Send, Camera, CloudOff, Plus, ChevronRight, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import StatCard from '@/components/dashboard/StatCard';
import PendingApprovalsWidget from '@/components/dashboard/PendingApprovalsWidget';
import MissingPhotosWidget from '@/components/dashboard/MissingPhotosWidget';
import SyncErrorsWidget from '@/components/dashboard/SyncErrorsWidget';
import UsageStatsWidget from '@/components/dashboard/UsageStatsWidget';
import RecentActivityWidget from '@/components/dashboard/RecentActivityWidget';
import ActivationChecklist from '@/components/dashboard/ActivationChecklist';
import NextActionBanner from '@/components/dashboard/NextActionBanner';
import TrialBanner from '@/components/trial/TrialBanner';
import TrialCountdownCard from '@/components/dashboard/TrialCountdownCard';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import BusinessMetrics from '@/components/dashboard/BusinessMetrics';
import { useDemo } from '@/lib/DemoContext';

const STATUS_COLORS = {
  new:              'bg-blue-100 text-blue-700',
  in_progress:      'bg-yellow-100 text-yellow-700',
  pending_approval: 'bg-orange-100 text-orange-700',
  approved:         'bg-green-100 text-green-700',
  closed:           'bg-muted text-muted-foreground',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const { isTrial, isExpired, daysLeft } = useTrialStatus();
  const { enterDemo } = useDemo();

  // Pull-to-refresh setup
  const dashboardQuery = useQuery({
    queryKey: ['jobs-dashboard'],
    queryFn: () => base44.entities.Job.filter({ is_deleted: false }, '-created_date', 30),
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { isRefreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(
    () => dashboardQuery.refetch()
  );

  // Safe UserProfile initialization with repair fallback
  useEffect(() => {
    if (!user) return;
    base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false })
      .then((profiles) => {
        if (profiles.length > 0) {
          const profile = profiles[0];
          setCompanyId(profile.company_id || null);
          const status = profile.onboarding_status;
          if (status && status !== 'onboarding_completed') {
            setOnboardingStatus(status);
          }
        } else {
          console.warn('[Dashboard] No UserProfile found for user:', user.id);
          setProfileError('missing');
        }
      })
      .catch((err) => {
        console.error('[Dashboard] UserProfile query failed:', err?.message || err);
        setProfileError('query_failed');
      });
  }, [user?.id]);

  // Re-use the query defined above for pull-to-refresh
  const { data: jobs = [], isLoading, error: jobsError } = dashboardQuery;

  const { data: pendingApprovals = [], error: approvalsError } = useQuery({
    queryKey: ['dashboard-pending-approvals-count'],
    queryFn: () => base44.entities.EstimateDraft.filter({ status: 'submitted', is_deleted: false }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  if (approvalsError) console.warn('[Dashboard] Pending approvals query failed:', approvalsError?.message);

  const { data: syncErrors = [], error: syncError } = useQuery({
    queryKey: ['dashboard-sync-errors-count'],
    queryFn: () => base44.entities.Photo.filter({ sync_status: 'failed', is_deleted: false }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  if (syncError) console.warn('[Dashboard] Sync errors query failed:', syncError?.message);

  // Handle profile errors — redirect if needed
  if (profileError === 'missing') {
    console.log('[Dashboard] Redirecting to account-recovery due to missing profile');
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto pt-20 text-center space-y-4">
        <AlertCircle size={32} className="mx-auto text-amber-600" />
        <h2 className="text-lg font-semibold font-display">Account setup required</h2>
        <p className="text-sm text-muted-foreground">Your account needs to be set up before accessing the dashboard.</p>
        <button
          onClick={() => navigate('/account-recovery')}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
        >
          Complete Setup
        </button>
      </div>
    );
  }

  const activeJobs = jobs.filter(j => ['new', 'in_progress'].includes(j.status));
  const emergency = jobs.filter(j => j.emergency_flag && ['new', 'in_progress'].includes(j.status));

  return (
    <div
      className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 relative scrollable-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="sticky top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg text-sm font-medium">
          <RefreshCw size={14} className="animate-spin" /> Refreshing…
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display">
            {user?.full_name ? `Welcome back, ${user.full_name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/demo"
            onClick={enterDemo}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
          >
            View Demo
          </Link>
          <Link
            to="/jobs/new"
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
          >
            <Plus size={15} /> New Job
          </Link>
        </div>
      </div>

      {/* Trial countdown / expiry banner */}
      {(isTrial || isExpired) && (
        <TrialBanner daysLeft={daysLeft} isExpired={isExpired} />
      )}

      {/* Smart next-action nudge — resolves automatically based on user state */}
      {user && (
        <NextActionBanner
          userId={user.id}
          companyId={companyId}
          onboardingStatus={onboardingStatus}
        />
      )}

      {/* Activation checklist — shown to new users until fully activated */}
      {user && (
        <ActivationChecklist userId={user.id} companyId={companyId} />
      )}

      {/* Business metrics — this month */}
      {jobsError ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">Unable to load business metrics. Please refresh.</p>
        </div>
      ) : (
        <BusinessMetrics />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Trial countdown card */}
        {(isTrial || isExpired) && (
          <div className="col-span-2 lg:col-span-1">
            <TrialCountdownCard isExpired={isExpired} daysLeft={daysLeft} />
          </div>
        )}
        <StatCard
          label="Active Jobs"
          value={activeJobs.length}
          icon={FolderOpen}
          color="text-blue-600"
          bg="bg-blue-100"
          to="/jobs"
          loading={isLoading}
        />
        <StatCard
          label="Pending Approvals"
          value={pendingApprovals.length}
          icon={Send}
          color="text-amber-600"
          bg="bg-amber-100"
          to="/jobs"
          loading={isLoading}
          urgent={pendingApprovals.length > 0}
        />
        <StatCard
          label="Sync Errors"
          value={syncErrors.length}
          icon={CloudOff}
          color={syncErrors.length > 0 ? 'text-destructive' : 'text-muted-foreground'}
          bg={syncErrors.length > 0 ? 'bg-red-100' : 'bg-muted'}
          loading={isLoading}
          urgent={syncErrors.length > 0}
        />
        <StatCard
          label="Total Jobs"
          value={jobs.length}
          icon={Camera}
          color="text-purple-600"
          bg="bg-purple-100"
          loading={isLoading}
        />
      </div>

      {/* Emergency banner */}
      {emergency.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-red-800">
            {emergency.length} emergency job{emergency.length > 1 ? 's' : ''} active —
          </p>
          <Link to="/jobs" className="text-sm text-red-700 underline font-medium">View jobs</Link>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col: recent jobs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active Jobs list */}
          <div className="bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold font-display">Active Jobs</h2>
              <Link to="/jobs" className="text-xs text-primary font-medium hover:underline">View all</Link>
            </div>
            {isLoading ? (
              <div className="p-3 space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : activeJobs.length === 0 ? (
              <div className="p-8 flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <FolderOpen size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No active jobs</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Create your first job to start tracking a restoration project.</p>
                </div>
                <Link
                  to="/jobs/new"
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
                >
                  <Plus size={14} /> Create Job
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeJobs.slice(0, 8).map((job) => (
                  <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{job.job_number || `Job #${job.id?.slice(-6)}`}</span>
                        {job.emergency_flag && <AlertCircle size={12} className="text-destructive shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', STATUS_COLORS[job.status] || 'bg-muted text-muted-foreground')}>
                          {job.status?.replace(/_/g, ' ')}
                        </span>
                        {job.loss_type && <span className="text-xs text-muted-foreground capitalize">{job.loss_type}</span>}
                        {job.date_of_loss && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={9} /> {format(new Date(job.date_of_loss), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-muted-foreground shrink-0 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvalsError ? (
              <div className="bg-card rounded-xl border border-border p-6 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">Unable to load pending approvals</p>
              </div>
            ) : (
              <PendingApprovalsWidget />
            )}
            <MissingPhotosWidget />
          </div>
          {syncError ? (
            <div className="bg-card rounded-xl border border-border p-6 flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">Unable to load sync errors</p>
            </div>
          ) : (
            <SyncErrorsWidget />
          )}
        </div>

        {/* Right col */}
        <div className="space-y-5">
          <UsageStatsWidget />
          <RecentActivityWidget />
        </div>
      </div>

      {showUpgrade && <UpgradePrompt feature="premium_analytics" onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}