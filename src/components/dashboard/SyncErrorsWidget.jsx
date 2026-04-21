import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { CloudOff, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function SyncErrorsWidget() {
  const { data: failedPhotos = [], isLoading, error } = useQuery({
    queryKey: ['dashboard-sync-errors'],
    queryFn: () => base44.entities.Photo.filter({ sync_status: 'failed', is_deleted: false }, '-created_date', 20),
  });

  // Gracefully handle permission errors
  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">Unable to load sync errors</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CloudOff size={14} className="text-destructive" />
          <span className="text-sm font-semibold font-display">Sync Errors</span>
        </div>
        {failedPhotos.length > 0 && (
          <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{failedPhotos.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="p-3 space-y-2">{[1,2].map(i => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : failedPhotos.length === 0 ? (
        <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
          <CheckCircle2 size={18} className="text-green-500" />
          <p className="text-sm text-muted-foreground">No sync errors.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {failedPhotos.slice(0, 5).map((p) => (
            <Link key={p.id} to={`/jobs/${p.job_id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.caption || 'Unnamed photo'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.created_date && format(new Date(p.created_date), 'MMM d, h:mm a')}
                </p>
              </div>
              <span className="text-xs text-destructive font-medium bg-red-50 px-1.5 py-0.5 rounded shrink-0">failed</span>
              <ChevronRight size={13} className="text-muted-foreground group-hover:text-primary shrink-0" />
            </Link>
          ))}
          {failedPhotos.length > 5 && (
            <div className="px-4 py-2 text-xs text-muted-foreground">+{failedPhotos.length - 5} more</div>
          )}
        </div>
      )}
    </div>
  );
}