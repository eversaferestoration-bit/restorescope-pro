import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { differenceInDays } from 'date-fns';

function FollowUpBadge({ sent, label }) {
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={sent
        ? { background: '#10b98120', color: '#10b981' }
        : { background: '#1e2d45', color: '#3a5a7c' }}>
      {sent ? <CheckCircle2 size={9} /> : <Clock size={9} />} {label}
    </span>
  );
}

export default function FollowUpAutomation({ requests = [] }) {
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReviewRequest.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['review-requests'] }),
  });

  // Only show sent (not yet reviewed, not stopped) requests
  const eligible = requests.filter(r =>
    r.status === 'sent' && !r.followup_stopped && r.sent_at
  );

  const sendFollowup = (r, type) => {
    const data = type === '2day'
      ? { followup_2day_sent: true }
      : { followup_5day_sent: true };
    updateMutation.mutate({ id: r.id, data });
    toast({ title: `Follow-up marked for ${r.customer_name}` });
  };

  const stopFollowup = (r) => {
    updateMutation.mutate({ id: r.id, data: { followup_stopped: true } });
    toast({ title: `Follow-ups stopped for ${r.customer_name}` });
  };

  const getDaysSinceSent = (sentAt) => {
    try { return differenceInDays(new Date(), new Date(sentAt)); }
    catch { return null; }
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <RefreshCw size={14} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">Follow-Up Automation</h2>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>
          {eligible.length} pending follow-ups
        </span>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-b flex items-center gap-4 text-xs flex-wrap" style={{ borderColor: '#1e2d45', color: '#7ba3c8' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
          2-day follow-up after initial send
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
          5-day follow-up if no response
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
          Auto-stop when reviewed
        </span>
      </div>

      {eligible.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm" style={{ color: '#3a5a7c' }}>No active follow-ups — send review requests and mark them as sent</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: '#1e2d45' }}>
          {eligible.map(r => {
            const daysSince = getDaysSinceSent(r.sent_at);
            const needs2day = daysSince >= 2 && !r.followup_2day_sent;
            const needs5day = daysSince >= 5 && !r.followup_5day_sent;

            return (
              <div key={r.id} className="flex items-start gap-4 px-5 py-4 hover:bg-white/3 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <p className="text-sm font-semibold text-white">{r.customer_name}</p>
                    {r.city && <span className="text-xs" style={{ color: '#7ba3c8' }}>📍 {r.city}</span>}
                    {daysSince !== null && (
                      <span className="text-xs" style={{ color: '#3a5a7c' }}>{daysSince}d since sent</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <FollowUpBadge sent={r.followup_2day_sent} label="2-day" />
                    <FollowUpBadge sent={r.followup_5day_sent} label="5-day" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {needs2day && (
                    <button onClick={() => sendFollowup(r, '2day')}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium hover:opacity-90 transition"
                      style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40' }}>
                      Send 2-Day
                    </button>
                  )}
                  {needs5day && (
                    <button onClick={() => sendFollowup(r, '5day')}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium hover:opacity-90 transition"
                      style={{ background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f640' }}>
                      Send 5-Day
                    </button>
                  )}
                  <button onClick={() => stopFollowup(r)}
                    className="text-xs px-2.5 py-1.5 rounded-lg hover:text-red-400 transition"
                    style={{ background: '#1e2d45', color: '#7ba3c8' }}>
                    <XCircle size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}