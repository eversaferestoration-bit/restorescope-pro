import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Bug, Lightbulb, MessageSquare, Zap, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const TYPE_ICONS = {
  bug: <Bug size={14} className="text-red-500" />,
  feature_request: <Lightbulb size={14} className="text-yellow-500" />,
  confusion: <MessageSquare size={14} className="text-blue-500" />,
  performance: <Zap size={14} className="text-orange-500" />,
  general: <MessageSquare size={14} className="text-muted-foreground" />,
};

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_CONFIG = {
  open: { label: 'Open', icon: <Clock size={12} />, cls: 'bg-blue-100 text-blue-700' },
  in_review: { label: 'In Review', icon: <AlertCircle size={12} />, cls: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resolved', icon: <CheckCircle2 size={12} />, cls: 'bg-green-100 text-green-700' },
  wont_fix: { label: "Won't Fix", icon: null, cls: 'bg-muted text-muted-foreground' },
};

export default function BetaFeedbackAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['beta-feedback-admin'],
    queryFn: () => base44.entities.BetaFeedback.filter({ is_deleted: false }, '-created_date', 200),
    staleTime: 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.BetaFeedback.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beta-feedback-admin'] }),
  });

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Admin access required.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-3 text-primary text-sm underline">Go to Dashboard</button>
      </div>
    );
  }

  const counts = {
    total: feedback.length,
    open: feedback.filter((f) => f.status === 'open').length,
    critical: feedback.filter((f) => f.severity === 'critical').length,
    bugs: feedback.filter((f) => f.feedback_type === 'bug').length,
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display">Beta Feedback</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All feedback submitted by beta testers</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, cls: 'text-foreground' },
          { label: 'Open', value: counts.open, cls: 'text-blue-600' },
          { label: 'Critical', value: counts.critical, cls: 'text-red-600' },
          { label: 'Bugs', value: counts.bugs, cls: 'text-orange-600' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-bold font-display ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Feedback list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : feedback.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <p className="text-muted-foreground">No feedback submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => {
            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
            return (
              <div key={item.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {TYPE_ICONS[item.feedback_type]}
                    <span className="font-semibold text-sm">{item.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[item.severity] || ''}`}>
                      {item.severity}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.cls}`}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  </div>
                  <select
                    className="text-xs h-7 px-2 rounded-lg border border-input bg-background focus:outline-none"
                    value={item.status}
                    onChange={(e) => updateMutation.mutate({ id: item.id, status: e.target.value })}
                  >
                    <option value="open">Open</option>
                    <option value="in_review">In Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="wont_fix">Won't Fix</option>
                  </select>
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>

                {item.screenshot_url && (
                  <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                    View screenshot
                  </a>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  <span>By: {item.user_email}</span>
                  {item.page_url && <span>Page: {item.page_url}</span>}
                  {item.created_date && <span>{format(new Date(item.created_date), 'MMM d, yyyy h:mm a')}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}