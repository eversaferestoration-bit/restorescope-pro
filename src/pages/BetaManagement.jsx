import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Search, FlaskConical, XCircle, Plus, CalendarPlus, CreditCard, ShieldOff, AlertCircle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

function getSafeCompany(raw) {
  return {
    ...raw,
    name: raw.name || '(Unnamed)',
    email: raw.email || null,
    is_beta_user: raw.is_beta_user || false,
    beta_status: raw.beta_status || 'none',
    beta_start_date: raw.beta_start_date || null,
    beta_end_date: raw.beta_end_date || null,
  };
}

function getBetaStatus(company) {
  if (!company.is_beta_user) return 'none';
  if (company.beta_status === 'expired') return 'expired';
  if (company.beta_end_date) {
    try {
      if (parseISO(company.beta_end_date) < new Date()) return 'expired';
    } catch { return 'expired'; }
  }
  return company.beta_status === 'active' ? 'active' : 'none';
}

function getDaysRemaining(company) {
  if (!company.beta_end_date || getBetaStatus(company) !== 'active') return 0;
  try {
    return Math.max(0, differenceInDays(parseISO(company.beta_end_date), new Date()));
  } catch { return 0; }
}

function safeFormat(dateStr, fmt) {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), fmt); } catch { return '—'; }
}

const STATUS_STYLES = {
  active:  'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  none:    'bg-muted text-muted-foreground',
};

export default function BetaManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    console.log('[BetaManagement] Page loaded');
  }, []);

  const { data: rawCompanies = [], isLoading, isError } = useQuery({
    queryKey: ['beta-companies'],
    queryFn: async () => {
      console.log('[BetaManagement] Company fetch started');
      const result = await base44.entities.Company.filter({ is_deleted: false }, 'name', 500);
      console.log(`[BetaManagement] Company fetch success — ${result.length} companies`);
      return result;
    },
    onError: (err) => console.error('[BetaManagement] Company fetch error:', err),
    retry: 2,
    staleTime: 60 * 1000,
  });

  // Sanitize every record; skip malformed ones
  const companies = rawCompanies.map((c) => {
    try { return getSafeCompany(c); } catch { return null; }
  }).filter(Boolean);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => qc.invalidateQueries(['beta-companies']),
    onSettled: () => setLoadingId(null),
  });

  const runAction = (company, action) => {
    setLoadingId(`${company.id}-${action}`);
    const today = new Date();
    if (action === 'enable') {
      const end = new Date(today);
      end.setDate(end.getDate() + 14);
      updateMutation.mutate({ id: company.id, data: {
        is_beta_user: true,
        beta_start_date: today.toISOString().split('T')[0],
        beta_end_date: end.toISOString().split('T')[0],
        beta_status: 'active',
      }});
    } else if (action === 'extend') {
      const currentEnd = company.beta_end_date ? parseISO(company.beta_end_date) : today;
      const base = currentEnd > today ? currentEnd : today;
      const newEnd = new Date(base);
      newEnd.setDate(newEnd.getDate() + 7);
      updateMutation.mutate({ id: company.id, data: {
        beta_end_date: newEnd.toISOString().split('T')[0],
        beta_status: 'active',
        is_beta_user: true,
      }});
    } else if (action === 'end') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      updateMutation.mutate({ id: company.id, data: {
        beta_end_date: yesterday.toISOString().split('T')[0],
        beta_status: 'expired',
      }});
    } else if (action === 'paid') {
      updateMutation.mutate({ id: company.id, data: {
        beta_status: 'expired',
        status: 'active',
        is_beta_user: false,
      }});
    }
  };

  const filtered = companies.filter((c) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Admin-only guard — rendered AFTER all hooks
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
        <ShieldOff size={32} className="text-muted-foreground" />
        <p className="font-semibold">Access Restricted</p>
        <p className="text-sm text-muted-foreground">Only administrators can manage beta users.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto scrollable-container">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical size={20} className="text-primary" />
            <h1 className="text-2xl font-bold font-display">Beta Users</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage beta access for all companies</p>
        </div>
      </div>

      {/* Search — always visible */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies…"
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Content states */}
      {isLoading ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">Loading companies…</p>
          {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center gap-3 text-center">
          <AlertCircle size={28} className="text-destructive" />
          <p className="font-semibold text-destructive">Failed to load companies</p>
          <p className="text-sm text-muted-foreground">Check your connection and try refreshing the page.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {['Company', 'Email', 'Beta Status', 'Days Left', 'Start Date', 'End Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No companies found.</td></tr>
                ) : filtered.map((company) => {
                  const status = getBetaStatus(company);
                  const daysLeft = getDaysRemaining(company);
                  return (
                    <tr key={company.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3 font-medium truncate max-w-[160px]">{company.name}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[180px]">{company.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', STATUS_STYLES[status])}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {status === 'active' ? (
                          <span className={cn('font-semibold', daysLeft <= 3 ? 'text-destructive' : 'text-foreground')}>
                            {daysLeft}d
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{safeFormat(company.beta_start_date, 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{safeFormat(company.beta_end_date, 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3">
                        <ActionButtons company={company} status={status} loadingId={loadingId} onAction={runAction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No companies found.</p>
            ) : filtered.map((company) => {
              const status = getBetaStatus(company);
              const daysLeft = getDaysRemaining(company);
              return (
                <div key={company.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{company.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{company.email || '—'}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0', STATUS_STYLES[status])}>
                      {status}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {status === 'active' && (
                      <span className={cn('font-semibold', daysLeft <= 3 ? 'text-destructive' : 'text-foreground')}>{daysLeft}d left</span>
                    )}
                    <span>Start: {safeFormat(company.beta_start_date, 'MMM d')}</span>
                    <span>End: {safeFormat(company.beta_end_date, 'MMM d')}</span>
                  </div>
                  <ActionButtons company={company} status={status} loadingId={loadingId} onAction={runAction} compact />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ActionButtons({ company, status, loadingId, onAction, compact = false }) {
  const isLoading = (action) => loadingId === `${company.id}-${action}`;
  const anyLoading = ['enable','extend','end','paid'].some(a => isLoading(a));

  const btnBase = cn(
    'inline-flex items-center gap-1 px-2.5 rounded-md text-xs font-medium transition disabled:opacity-50',
    compact ? 'h-8' : 'h-7'
  );

  return (
    <div className={cn('flex flex-wrap gap-1.5', compact && 'gap-2')}>
      {(status === 'none' || status === 'expired') && (
        <button onClick={() => onAction(company, 'enable')} disabled={anyLoading} className={cn(btnBase, 'bg-green-100 text-green-700 hover:bg-green-200')}>
          {isLoading('enable') ? '…' : <><Plus size={11} /> Enable Beta</>}
        </button>
      )}
      {status === 'active' && (
        <>
          <button onClick={() => onAction(company, 'extend')} disabled={anyLoading} className={cn(btnBase, 'bg-blue-100 text-blue-700 hover:bg-blue-200')}>
            {isLoading('extend') ? '…' : <><CalendarPlus size={11} /> +7 Days</>}
          </button>
          <button onClick={() => onAction(company, 'end')} disabled={anyLoading} className={cn(btnBase, 'bg-red-100 text-red-700 hover:bg-red-200')}>
            {isLoading('end') ? '…' : <><XCircle size={11} /> End Beta</>}
          </button>
        </>
      )}
      {status !== 'none' && (
        <button onClick={() => onAction(company, 'paid')} disabled={anyLoading} className={cn(btnBase, 'bg-primary/10 text-primary hover:bg-primary/20')}>
          {isLoading('paid') ? '…' : <><CreditCard size={11} /> Convert to Paid</>}
        </button>
      )}
    </div>
  );
}