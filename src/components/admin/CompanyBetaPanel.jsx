import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FlaskConical, CalendarPlus, Ban, Zap, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  active:  { badge: 'bg-green-100 text-green-700', label: 'Active' },
  expired: { badge: 'bg-red-100 text-red-700',   label: 'Expired' },
  none:    { badge: 'bg-muted text-muted-foreground', label: 'No Beta' },
};

function derivedStatus(company) {
  if (!company?.is_beta_user) return 'none';
  if (company.beta_status === 'expired') return 'expired';
  if (company.beta_end_date) {
    try { if (parseISO(company.beta_end_date) < new Date()) return 'expired'; } catch { return 'expired'; }
  }
  return company.beta_status === 'active' ? 'active' : 'none';
}

function safeFormat(dateStr, fmt) {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), fmt); } catch { return '—'; }
}

function getDaysRemaining(company) {
  if (derivedStatus(company) !== 'active' || !company.beta_end_date) return null;
  try { return Math.max(0, differenceInDays(parseISO(company.beta_end_date), new Date())); } catch { return null; }
}

/**
 * Inline beta access control panel for a single company.
 * Pass companyId (string) — fetches and manages beta state in isolation.
 * Only renders content; caller is responsible for admin-only gating.
 */
export default function CompanyBetaPanel({ companyId }) {
  const qc = useQueryClient();
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const { data: company, isLoading } = useQuery({
    queryKey: ['company-beta-panel', companyId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getBetaCompanies', {});
      const all = res.data?.companies || [];
      return all.find((c) => c.id === companyId) || null;
    },
    enabled: !!companyId,
    staleTime: 30 * 1000,
  });

  const mutation = useMutation({
    mutationFn: (action) =>
      base44.functions.invoke('updateBetaAccess', { company_id: companyId, action }),
    onSuccess: (res, action) => {
      if (res.data?.success) {
        const labels = { enable: 'Beta enabled (14 days)', extend: 'Extended +7 days', end: 'Beta ended' };
        showFeedback('success', labels[action] || 'Done');
      } else {
        showFeedback('error', res.data?.error || 'Action failed');
      }
      qc.invalidateQueries(['company-beta-panel', companyId]);
      qc.invalidateQueries(['beta-companies']);
    },
    onError: (err) => showFeedback('error', err?.message || 'Action failed'),
    onSettled: () => setActionLoading(null),
  });

  const run = (action) => {
    setActionLoading(action);
    mutation.mutate(action);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border p-4 space-y-2 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-8 w-full bg-muted rounded" />
      </div>
    );
  }

  const status = derivedStatus(company);
  const daysLeft = company ? getDaysRemaining(company) : null;
  const style = STATUS_STYLES[status];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <FlaskConical size={15} className="text-violet-600" />
        <h3 className="text-sm font-semibold">Beta Access</h3>
        <span className={cn('ml-auto text-xs px-2 py-0.5 rounded-full font-medium', style.badge)}>
          {style.label}
        </span>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3 text-xs border-b border-border">
        <div>
          <p className="text-muted-foreground mb-0.5">Start Date</p>
          <p className="font-medium">{safeFormat(company?.beta_start_date, 'MMM d, yyyy')}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">End Date</p>
          <p className="font-medium">{safeFormat(company?.beta_end_date, 'MMM d, yyyy')}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Days Left</p>
          <p className={cn('font-medium', daysLeft !== null && daysLeft <= 3 ? 'text-destructive' : '')}>
            {daysLeft !== null ? `${daysLeft}d` : '—'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex flex-wrap gap-2">
        {(status === 'none' || status === 'expired') && (
          <button
            onClick={() => run('enable')}
            disabled={!!actionLoading}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium transition disabled:opacity-50"
          >
            <Zap size={12} />
            {actionLoading === 'enable' ? 'Enabling…' : 'Enable 14-Day Beta'}
          </button>
        )}
        {status === 'active' && (
          <button
            onClick={() => run('extend')}
            disabled={!!actionLoading}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-medium transition disabled:opacity-50"
          >
            <CalendarPlus size={12} />
            {actionLoading === 'extend' ? 'Extending…' : 'Extend +7 Days'}
          </button>
        )}
        {status === 'active' && (
          <button
            onClick={() => run('end')}
            disabled={!!actionLoading}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium transition disabled:opacity-50"
          >
            <Ban size={12} />
            {actionLoading === 'end' ? 'Ending…' : 'End Beta Now'}
          </button>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={cn(
          'mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
          feedback.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        )}>
          {feedback.type === 'success'
            ? <CheckCircle2 size={13} className="text-green-600 shrink-0" />
            : <AlertCircle size={13} className="text-red-600 shrink-0" />
          }
          {feedback.message}
        </div>
      )}
    </div>
  );
}