import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Send, XCircle, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#f59e0b', bg: '#f59e0b20' },
  sent:        { label: 'Sent',        color: '#3b82f6', bg: '#3b82f620' },
  reviewed:    { label: 'Reviewed',    color: '#10b981', bg: '#10b98120' },
  no_response: { label: 'No Response', color: '#3a5a7c', bg: '#1e2d45'   },
};

const SENTIMENT_CONFIG = {
  positive: { label: '😊 Positive', color: '#10b981' },
  neutral:  { label: '😐 Neutral',  color: '#f59e0b' },
  negative: { label: '😟 Negative', color: '#ef4444' },
  unknown:  { label: '—',           color: '#3a5a7c'  },
};

export default function ReviewTrackingTable({ requests = [], isLoading }) {
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReviewRequest.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['review-requests'] }),
  });

  const markSent = (r) => updateMutation.mutate({
    id: r.id,
    data: { status: 'sent', sent_at: new Date().toISOString() },
  });

  const markReviewed = (r) => {
    updateMutation.mutate({
      id: r.id,
      data: { status: 'reviewed', reviewed_at: new Date().toISOString(), followup_stopped: true },
    });
    toast({ title: `✅ ${r.customer_name} marked as reviewed` });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">Review Tracking</h2>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>
          {requests.length} requests
        </span>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: '#1e2d45' }} />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: '#3a5a7c' }}>No review requests yet — create one above</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider border-b" style={{ color: '#3a5a7c', borderColor: '#1e2d45' }}>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Service</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Sentiment</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: '#1e2d45' }}>
              {requests.map(r => {
                const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                const sentiment = SENTIMENT_CONFIG[r.sentiment] || SENTIMENT_CONFIG.unknown;
                return (
                  <tr key={r.id} className="hover:bg-white/3 transition border-b" style={{ borderColor: '#1e2d45' }}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{r.customer_name}</p>
                      {r.phone && <p className="text-xs" style={{ color: '#7ba3c8' }}>{r.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-white">{r.city || '—'}</td>
                    <td className="px-4 py-3" style={{ color: '#c8d9eb' }}>{r.job_type || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: sentiment.color }}>{sentiment.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {r.status === 'pending' && (
                          <button onClick={() => markSent(r)} title="Mark Sent"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:text-blue-400 transition"
                            style={{ background: '#1e2d45', color: '#7ba3c8' }}>
                            <Send size={10} /> Sent
                          </button>
                        )}
                        {r.status !== 'reviewed' && (
                          <button onClick={() => markReviewed(r)} title="Mark Reviewed"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:text-green-400 transition"
                            style={{ background: '#1e2d45', color: '#7ba3c8' }}>
                            <CheckCircle2 size={10} /> Reviewed
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}