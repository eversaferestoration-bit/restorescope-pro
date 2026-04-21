import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Search, FlaskConical, Plus, Clock, Ban, CreditCard, ChevronDown, Shield } from 'lucide-react';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  active:  'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  none:    'bg-muted text-muted-foreground',
};

function getSafeCompany(company) {
  return {
    ...company,
    beta_status: company.beta_status || 'none',
    beta_start_date: company.beta_start_date || null,
    beta_end_date: company.beta_end_date || null,
    is_beta_user: company.is_beta_user || false,
    name: company.name || '(Unnamed)',
    email: company.email || null,
  };
}

function getBetaStatus(company) {
  if (!company.is_beta_user) return 'none';
  if (company.beta_status === 'expired') return 'expired';
  if (company.beta_end_date) {
    try {
      const end = parseISO(company.beta_end_date);
      if (end < new Date()) return 'expired';
    } catch { return 'expired'; }
  }
  return company.beta_status === 'active' ? 'active' : 'none';
}

function getDaysRemaining(company) {
  if (!company.beta_end_date || getBetaStatus(company) !== 'active') return 0;
  try {
    const days = differenceInDays(parseISO(company.beta_end_date), new Date());
    return Math.max(0, days);
  } catch { return 0; }
}

function ActionMenu({ company, onAction }) {
  const [open, setOpen] = useState(false);
  const status = getBetaStatus(company);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-3 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition user-select-none"
      >
        Actions <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 bg-card border border-border rounded-xl shadow-lg w-48 overflow-hidden py-1">
            {status !== 'active' && (
              <button
                onClick={() => { onAction('enable', company); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition text-left user-select-none"
              >
                <FlaskConical size={14} className="text-primary" /> Enable Beta (14d)
              </button>
            )}
            {status === 'active' && (
              <button
                onClick={() => { onAction('extend', company); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition text-left user-select-none"
              >
                <Plus size={14} className="text-blue-600" /> Extend +7 Days
              </button>
            )}
            {status === 'active' && (
              <button
                onClick={() => { onAction('end', company); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition text-left text-destructive user-select-none"
              >
                <Ban size={14} /> End Beta
              </button>
            )}
            <button
              onClick={() => { onAction('paid', company); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition text-left user-select-none"
            >
              <CreditCard size={14} className="text-green-600" /> Convert to Paid
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function BetaUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    console.log('[BetaUsers] Page loaded');
  }, []);

  const { data: rawCompanies = [], isLoading, isError } = useQuery({
    queryKey: ['companies-beta'],
    queryFn: async () => {
      console.log('[BetaUsers] Company fetch started');
      const result = await base44.entities.Company.filter({ is_deleted: false }, 'name', 200);
      console.log(`[BetaUsers] Company fetch success — ${result.length} companies`);
      return result;
    },
    onError: (err) => {
      console.error('[BetaUsers] Company fetch error:', err);
    },
    retry: 2,
    staleTime: 30 * 1000,
  });

  const companies = rawCompanies.map((c) => { try { return getSafeCompany(c); } catch { return null; } }).filter(Boolean);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => qc.invalidateQueries(['companies-beta']),
  });

  // Guard: admin only
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
        <Shield size={32} className="text-muted-foreground" />
        <p className="font-semibold">Access Restricted</p>
        <p className="text-sm text-muted-foreground">Only admins can view Beta Management.</p>
      </div>
    );
  }

  const handleAction = (action, company) => {
    const today = new Date();
    if (action === 'enable') {
      const end = addDays(today, 14);
      updateMutation.mutate({ id: company.id, data: {
        is_beta_user: true,
        beta_status: 'active',
        beta_start_date: today.toISOString().split('T')[0],
        beta_end_date: end.toISOString().split('T')[0],
      }});
    } else if (action === 'extend') {
      const current = company.beta_end_date ? parseISO(company.beta_end_date) : today;
      const base = current > today ? current : today;
      const end = addDays(base, 7);
      updateMutation.mutate({ id: company.id, data: {
        beta_end_date: end.toISOString().split('T')[0],
        beta_status: 'active',
      }});
    } else if (action === 'end') {
      const yesterday = addDays(today, -1);
      updateMutation.mutate({ id: company.id, data: {
        beta_end_date: yesterday.toISOString().split('T')[0],
        beta_status: 'expired',
      }});
    } else if (action === 'paid') {
      updateMutation.mutate({ id: company.id, data: {
        is_beta_user: false,
        beta_status: 'expired',
        status: 'active',
      }});
    }
  };

  const filtered = companies.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto scrollable-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display">Beta Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage beta access for all companies</p>
        </div>
        <button
          onClick={() => setShowSearch((v) => !v)}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition user-select-none"
        >
          <Search size={15} /> Search Companies
        </button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name or email…"
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground text-center mb-2">Loading companies…</p>
            {[1,2,3,4].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : isError ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-destructive">Failed to load companies</p>
            <p className="text-xs text-muted-foreground">Check your connection and try refreshing the page.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No companies found.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Days Left</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">End Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((company) => {
                    const status = getBetaStatus(company);
                    const daysLeft = getDaysRemaining(company);
                    return (
                      <tr key={company.id} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3 font-medium">{company.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{company.email || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[status])}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {status === 'active'
                            ? <span className={cn('font-medium', daysLeft <= 3 && 'text-destructive')}>{daysLeft}d</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {company.beta_start_date ? format(parseISO(company.beta_start_date), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {company.beta_end_date ? format(parseISO(company.beta_end_date), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ActionMenu company={company} onAction={handleAction} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((company) => {
                const status = getBetaStatus(company);
                const daysLeft = getDaysRemaining(company);
                return (
                  <div key={company.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.email || '—'}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', STATUS_STYLES[status])}>
                        {status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Start: {company.beta_start_date ? format(parseISO(company.beta_start_date), 'MMM d') : '—'}</span>
                      <span>End: {company.beta_end_date ? format(parseISO(company.beta_end_date), 'MMM d') : '—'}</span>
                      {status === 'active' && (
                        <span className={cn('font-medium', daysLeft <= 3 ? 'text-destructive' : 'text-foreground')}>{daysLeft}d left</span>
                      )}
                    </div>
                    <div className="pt-1">
                      <ActionMenu company={company} onAction={handleAction} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">{filtered.length} compan{filtered.length === 1 ? 'y' : 'ies'} shown</p>
    </div>
  );
}