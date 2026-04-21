import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

function UsageBar({ label, used, limit, color }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const danger = pct >= 90;
  const warn = pct >= 70;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold">
          {limit ? <>{used.toLocaleString()} / {limit.toLocaleString()}</> : used.toLocaleString()}
        </span>
      </div>
      {limit && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', danger ? 'bg-destructive' : warn ? 'bg-amber-500' : (color || 'bg-primary'))}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function UsageStatsWidget() {
  const { user } = useAuth();

  // Usage stats — only load after auth confirmed
  const { data: jobs = [], error: jobsError } = useQuery({
    queryKey: ['dashboard-usage-jobs'],
    queryFn: () => base44.entities.Job.filter({ is_deleted: false }),
    enabled: !!user?.company_id,
    staleTime: 3 * 60 * 1000,
  });

  const { data: photos = [], error: photosError } = useQuery({
    queryKey: ['dashboard-usage-photos'],
    queryFn: () => base44.entities.Photo.filter({ is_deleted: false }),
    enabled: !!user?.company_id,
    staleTime: 3 * 60 * 1000,
  });

  const { data: company, error: companyError } = useQuery({
    queryKey: ['dashboard-company', user?.company_id],
    queryFn: () => base44.entities.Company.filter({ id: user?.company_id, is_deleted: false }).then(r => r[0]),
    enabled: !!user?.company_id,
    staleTime: 5 * 60 * 1000,
  });

  // Count jobs this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyJobs = jobs.filter(j => j.created_date && new Date(j.created_date) >= monthStart).length;

  // Skip rendering if any critical query failed
  if (jobsError || photosError || companyError) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <BarChart3 size={14} className="text-primary" />
        <span className="text-sm font-semibold font-display">Usage Stats</span>
      </div>
      <div className="p-4 space-y-3.5">
        <UsageBar
          label="Jobs this month"
          used={monthlyJobs}
          limit={company?.monthly_job_limit || null}
        />
        <UsageBar
          label="Total jobs"
          used={jobs.length}
          limit={null}
          color="bg-chart-2"
        />
        <UsageBar
          label="Photos stored"
          used={photos.length}
          limit={null}
          color="bg-chart-4"
        />
        {company?.seat_limit && (
          <UsageBar
            label="Seats"
            used={1}
            limit={company.seat_limit}
            color="bg-chart-3"
          />
        )}
        {company?.plan_id ? (
          <div className="pt-1">
            <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-1 rounded-full">Active subscription</span>
          </div>
        ) : (
          <div className="pt-1">
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-1 rounded-full">No active plan</span>
          </div>
        )}
      </div>
    </div>
  );
}