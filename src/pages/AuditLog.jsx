import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ClipboardList, Search } from 'lucide-react';
import { format } from 'date-fns';

const ACTION_COLORS = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
};

export default function AuditLog() {
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 200),
  });

  const filtered = logs.filter((l) =>
    !search ||
    l.description?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Full history of all actions in your account</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center gap-3 min-h-[220px]">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <ClipboardList size={22} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold font-display">No events yet</p>
              <p className="text-sm text-muted-foreground mt-1">Audit events will appear here as actions are performed.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-muted-foreground">{log.entity_type}</span>
                  </div>
                  <p className="text-sm mt-0.5 truncate">{log.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.actor_email}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                  {log.created_date ? format(new Date(log.created_date), 'MMM d, h:mm a') : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}