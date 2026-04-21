import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Activity, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const ACTION_STYLES = {
  created:                'bg-green-100 text-green-700',
  updated:                'bg-blue-100 text-blue-700',
  deleted:                'bg-red-100 text-red-700',
  generated:              'bg-purple-100 text-purple-700',
  exported:               'bg-teal-100 text-teal-700',
  justification_generated:'bg-indigo-100 text-indigo-700',
};

export default function RecentActivityWidget() {
  const { user } = useAuth();

  // AuditLog is admin-only (by RLS) — only query if user is admin
  // Intentionally skip query on first load to avoid initial dashboard delay
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 15),
    enabled: user?.role === 'admin' && typeof window !== 'undefined' && sessionStorage.getItem('dashboard-ready'),
    staleTime: 5 * 60 * 1000,
  });

  if (user?.role !== 'admin') {
    return null; // RecentActivityWidget is admin-only
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Activity size={14} className="text-primary" />
        <span className="text-sm font-semibold font-display">Recent Activity</span>
      </div>

      {error ? (
        <div className="px-4 py-6 flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>Unable to load activity log</span>
        </div>
      ) : isLoading ? (
        <div className="p-3 space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : logs.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">No activity yet.</div>
      ) : (
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 mt-0.5', ACTION_STYLES[log.action] || 'bg-muted text-muted-foreground')}>
                {log.action?.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate leading-relaxed">{log.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{log.actor_email}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 pt-0.5" title={log.created_date ? format(new Date(log.created_date), 'PPpp') : ''}>
                {log.created_date ? formatDistanceToNow(new Date(log.created_date), { addSuffix: true }) : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}