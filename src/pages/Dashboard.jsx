import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Plus, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  pending_approval: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  closed: 'bg-muted text-muted-foreground',
};

export default function Dashboard() {
  const { user } = useAuth();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs-dashboard'],
    queryFn: () => base44.entities.Job.filter({ is_deleted: false }, '-created_date', 10),
  });

  const active = jobs.filter((j) => ['new', 'in_progress'].includes(j.status)).length;
  const pending = jobs.filter((j) => j.status === 'pending_approval').length;
  const emergency = jobs.filter((j) => j.emergency_flag).length;

  const stats = [
    { label: 'Active Jobs', value: isLoading ? '—' : active },
    { label: 'Pending Approval', value: isLoading ? '—' : pending },
    { label: 'Emergency', value: isLoading ? '—' : emergency },
    { label: 'Total Jobs', value: isLoading ? '—' : jobs.length },
  ];

  const recent = jobs.slice(0, 5);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">
          {user?.full_name ? `Welcome, ${user.full_name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold font-display">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent jobs */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold font-display">Recent Jobs</h2>
          <Link to="/jobs" className="text-xs text-primary font-medium hover:underline">View all</Link>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-10 flex flex-col items-center text-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
              <FolderOpen size={20} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold font-display text-sm">No jobs yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first job to get started.</p>
            </div>
            <Link
              to="/jobs/new"
              className="inline-flex items-center gap-2 px-4 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition"
            >
              <Plus size={13} /> Create Job
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {job.job_number || `Job #${job.id?.slice(-6)}`}
                    </span>
                    {job.emergency_flag && <AlertCircle size={13} className="text-destructive shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {job.status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status] || ''}`}>
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    )}
                    {job.date_of_loss && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={10} /> {format(new Date(job.date_of_loss), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={15} className="text-muted-foreground shrink-0 group-hover:text-primary transition" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}