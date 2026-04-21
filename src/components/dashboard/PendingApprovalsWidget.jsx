import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Send, ChevronRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PendingApprovalsWidget() {
  const { data: drafts = [], isLoading, error } = useQuery({
    queryKey: ['dashboard-pending-approvals'],
    queryFn: () => base44.entities.EstimateDraft.filter({ status: 'submitted', is_deleted: false }, '-created_date', 10),
    staleTime: 2 * 60 * 1000,
  });

  // Gracefully handle permission errors
  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">Unable to load pending approvals</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Send size={14} className="text-amber-500" />
          <span className="text-sm font-semibold font-display">Pending Approvals</span>
        </div>
        {drafts.length > 0 && (
          <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{drafts.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="p-3 space-y-2">{[1,2].map(i => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : drafts.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">No estimates awaiting approval.</div>
      ) : (
        <div className="divide-y divide-border">
          {drafts.map((d) => (
            <Link key={d.id} to={`/jobs/${d.job_id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${(d.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  {d.created_date && <> · {format(new Date(d.created_date), 'MMM d')}</>}
                </p>
              </div>
              <ChevronRight size={13} className="text-muted-foreground group-hover:text-primary shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}