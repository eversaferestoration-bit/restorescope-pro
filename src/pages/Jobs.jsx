import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Plus, FolderOpen, Search, ChevronRight, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  pending_approval: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  closed: 'bg-muted text-muted-foreground',
};

export default function Jobs() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const jobsQuery = useQuery({
    queryKey: ['jobs', page, search],
    queryFn: async () => {
      // Fetch with pagination
      const allJobs = await base44.entities.Job.filter({ is_deleted: false }, '-created_date', 200);
      // Client-side filtering and pagination
      let filtered = allJobs;
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = allJobs.filter((j) =>
          j.job_number?.toLowerCase().includes(searchLower) ||
          j.loss_type?.toLowerCase().includes(searchLower) ||
          j.status?.toLowerCase().includes(searchLower)
        );
      }
      return filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: jobs = [], isLoading, isFetching } = jobsQuery;
  const { isRefreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(
    () => jobsQuery.refetch()
  );

  // Get total count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['jobs-count', search],
    queryFn: async () => {
      const allJobs = await base44.entities.Job.filter({ is_deleted: false }, '-created_date', 1000);
      if (!search) return allJobs.length;
      const searchLower = search.toLowerCase();
      return allJobs.filter((j) =>
        j.job_number?.toLowerCase().includes(searchLower) ||
        j.loss_type?.toLowerCase().includes(searchLower) ||
        j.status?.toLowerCase().includes(searchLower)
      ).length;
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const hasMore = page < totalPages - 1;

  return (
    <div
      className="p-4 md:p-6 max-w-5xl mx-auto relative"
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All restoration jobs</p>
        </div>
        <Link
          to="/jobs/new"
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
        >
          <Plus size={15} /> New Job
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs…"
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 && page === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <FolderOpen size={22} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold font-display">No jobs found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'Try a different search term.' : 'Create your first job to get started.'}
            </p>
          </div>
          {!search && (
            <Link
              to="/jobs/new"
              className="mt-1 inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
            >
              <Plus size={14} /> Create Job
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="flex items-center gap-4 bg-card rounded-xl border border-border px-4 py-3.5 hover:border-primary/40 hover:shadow-sm transition group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm font-display truncate">
                    {job.job_number || `Job #${job.id?.slice(-6)}`}
                  </span>
                  {job.emergency_flag && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                      <AlertCircle size={11} /> Emergency
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {job.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status] || 'bg-muted text-muted-foreground'}`}>
                      {job.status.replace(/_/g, ' ')}
                    </span>
                  )}
                  {job.loss_type && (
                    <span className="text-xs text-muted-foreground">{job.loss_type}</span>
                  )}
                  {job.date_of_loss && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={11} /> {format(new Date(job.date_of_loss), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0 group-hover:text-primary transition" />
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-muted-foreground">
            Showing {(page * PAGE_SIZE) + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} jobs
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 h-8 rounded-lg border text-xs font-medium hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={!hasMore}
              className="px-3 h-8 rounded-lg border text-xs font-medium hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}