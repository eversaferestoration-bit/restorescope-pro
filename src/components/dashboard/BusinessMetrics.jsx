import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Briefcase, FileText, Send, Clock } from 'lucide-react';
import { startOfMonth } from 'date-fns';

function MetricTile({ icon: Icon, color, bg, label, value, loading }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={17} className={color} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold font-display leading-none mt-1">
          {loading
            ? <span className="inline-block w-10 h-6 bg-muted rounded animate-pulse" />
            : value}
        </p>
      </div>
    </div>
  );
}

export default function BusinessMetrics() {
  const monthStart = startOfMonth(new Date()).toISOString();

  const { data: jobs = [], isLoading: loadingJobs, error: jobsError } = useQuery({
    queryKey: ['biz-metrics-jobs', monthStart],
    queryFn: () => base44.entities.Job.filter({ is_deleted: false }, '-created_date', 200),
    enabled: true, // Load on demand once dashboard mounts
    staleTime: 5 * 60 * 1000,
  });

  const { data: estimates = [], isLoading: loadingEstimates, error: estimatesError } = useQuery({
    queryKey: ['biz-metrics-estimates', monthStart],
    queryFn: () => base44.entities.EstimateDraft.filter({ is_deleted: false }, '-created_date', 200),
    enabled: true, // Load on demand once dashboard mounts
    staleTime: 5 * 60 * 1000,
  });

  const loading = loadingJobs || loadingEstimates;

  // Gracefully skip if queries fail
  if (jobsError || estimatesError) {
    return null;
  }

  // Jobs created this month
  const jobsThisMonth = jobs.filter(j => j.created_date >= monthStart).length;

  // Estimates created this month
  const estimatesThisMonth = estimates.filter(e => e.created_date >= monthStart).length;

  // Approvals submitted this month (status submitted or approved)
  const approvalsThisMonth = estimates.filter(
    e => ['submitted', 'approved', 'pending_review'].includes(e.status) && e.created_date >= monthStart
  ).length;

  // Avg estimate time: hours between job.created_date and first estimate for that job
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));
  const durations = [];
  const seenJobs = new Set();
  [...estimates]
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    .forEach(e => {
      if (seenJobs.has(e.job_id)) return;
      const job = jobMap[e.job_id];
      if (job?.created_date && e.created_date) {
        const hours = (new Date(e.created_date) - new Date(job.created_date)) / (1000 * 60 * 60);
        if (hours >= 0 && hours < 720) { // sanity cap: under 30 days
          durations.push(hours);
          seenJobs.add(e.job_id);
        }
      }
    });
  const avgHours = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : null;

  const avgEstimateDisplay = loading
    ? '—'
    : avgHours === null
    ? '—'
    : avgHours < 1
    ? `${Math.round(avgHours * 60)}m`
    : avgHours < 48
    ? `${avgHours.toFixed(1)}h`
    : `${(avgHours / 24).toFixed(1)}d`;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
        This Month
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile
          icon={Briefcase}
          color="text-indigo-600"
          bg="bg-indigo-50"
          label="Jobs Created"
          value={loading ? null : jobsThisMonth}
          loading={loading}
        />
        <MetricTile
          icon={FileText}
          color="text-teal-600"
          bg="bg-teal-50"
          label="Estimates Created"
          value={loading ? null : estimatesThisMonth}
          loading={loading}
        />
        <MetricTile
          icon={Send}
          color="text-amber-600"
          bg="bg-amber-50"
          label="Approvals Submitted"
          value={loading ? null : approvalsThisMonth}
          loading={loading}
        />
        <MetricTile
          icon={Clock}
          color="text-rose-600"
          bg="bg-rose-50"
          label="Avg. Estimate Time"
          value={avgEstimateDisplay}
          loading={loading}
        />
      </div>
    </div>
  );
}