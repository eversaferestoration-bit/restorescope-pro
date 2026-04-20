import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { FlaskConical, Plus, Zap, Calendar, Clock, Loader2 } from 'lucide-react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function BetaManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [actingCompanyId, setActingCompanyId] = useState(null);

  // Only admins can access
  if (user?.role !== 'admin') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 font-semibold">Admin access required</p>
        </div>
      </div>
    );
  }

  // Fetch all companies with beta status
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['all-companies-beta'],
    queryFn: () => base44.asServiceRole.entities.Company.filter({ is_deleted: false }, '-created_date'),
  });

  const betaCompanies = companies.filter((c) => c.is_beta_user);

  // Calculate days remaining
  const daysRemaining = (company) => {
    if (!company.beta_end_date) return null;
    const endDate = parseISO(company.beta_end_date);
    const remaining = differenceInDays(endDate, new Date());
    return Math.max(0, remaining);
  };

  // Enable beta on a company
  const handleEnableBeta = async (company) => {
    setActingCompanyId(company.id);
    try {
      const startDate = new Date();
      const endDate = addDays(startDate, 14);
      await base44.asServiceRole.entities.Company.update(company.id, {
        is_beta_user: true,
        beta_start_date: format(startDate, 'yyyy-MM-dd'),
        beta_end_date: format(endDate, 'yyyy-MM-dd'),
        beta_status: 'active',
      });
      qc.invalidateQueries(['all-companies-beta']);
      toast.success('Beta access enabled');
    } catch (e) {
      toast.error('Failed to enable beta');
    }
    setActingCompanyId(null);
  };

  // Extend beta by 7 days
  const handleExtendBeta = async (company) => {
    setActingCompanyId(company.id);
    try {
      const currentEndDate = company.beta_end_date ? parseISO(company.beta_end_date) : new Date();
      const newEndDate = addDays(currentEndDate, 7);
      await base44.asServiceRole.entities.Company.update(company.id, {
        beta_end_date: format(newEndDate, 'yyyy-MM-dd'),
      });
      qc.invalidateQueries(['all-companies-beta']);
      toast.success('Beta extended by 7 days');
    } catch (e) {
      toast.error('Failed to extend beta');
    }
    setActingCompanyId(null);
  };

  // End beta immediately
  const handleEndBeta = async (company) => {
    setActingCompanyId(company.id);
    try {
      await base44.asServiceRole.entities.Company.update(company.id, {
        is_beta_user: false,
        beta_status: 'expired',
      });
      qc.invalidateQueries(['all-companies-beta']);
      toast.success('Beta access ended');
    } catch (e) {
      toast.error('Failed to end beta');
    }
    setActingCompanyId(null);
  };

  // Convert to paid (create active subscription)
  const handleConvertToPaid = async (company) => {
    setActingCompanyId(company.id);
    try {
      // Create or update subscription to active status
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        company_id: company.id,
        is_deleted: false,
      });

      if (subs.length > 0) {
        // Update existing subscription
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
          status: 'active',
        });
      } else {
        // Create new subscription (assumes base Plan entity exists)
        await base44.asServiceRole.entities.Subscription.create({
          company_id: company.id,
          status: 'active',
          plan_id: 'professional',
          created_by: user?.email,
          is_deleted: false,
        });
      }

      qc.invalidateQueries(['all-companies-beta']);
      toast.success('Company converted to paid plan');
    } catch (e) {
      toast.error('Failed to convert to paid');
    }
    setActingCompanyId(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <FlaskConical size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display">Beta Management</h1>
          <p className="text-sm text-muted-foreground">Manage all beta companies and trial access</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Beta Companies</p>
          <p className="text-2xl font-bold">{betaCompanies.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Active Trials</p>
          <p className="text-2xl font-bold">
            {betaCompanies.filter((c) => c.beta_status === 'active').length}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Expiring Soon (7 days)</p>
          <p className="text-2xl font-bold">
            {betaCompanies.filter((c) => {
              const days = daysRemaining(c);
              return days !== null && days <= 7 && days > 0;
            }).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : betaCompanies.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No beta companies yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Days Left</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Start Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">End Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {betaCompanies.map((company) => {
                  const days = daysRemaining(company);
                  const isActive = company.beta_status === 'active';
                  const isExpiring = days !== null && days <= 7;
                  const isExpired = days !== null && days <= 0;

                  return (
                    <tr key={company.id} className="hover:bg-muted/40 transition">
                      <td className="px-4 py-3 text-sm font-medium">{company.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{company.email || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            isExpired
                              ? 'bg-red-100 text-red-700'
                              : isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {company.beta_status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {days === null ? (
                          '—'
                        ) : (
                          <span className={isExpiring && !isExpired ? 'font-semibold text-amber-600' : ''}>
                            {days} days
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {company.beta_start_date ? format(parseISO(company.beta_start_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {company.beta_end_date ? format(parseISO(company.beta_end_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isActive && (
                            <button
                              onClick={() => handleEnableBeta(company)}
                              disabled={actingCompanyId === company.id}
                              className="inline-flex items-center gap-1 px-2 h-7 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-60"
                              title="Enable beta"
                            >
                              {actingCompanyId === company.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Plus size={12} />
                              )}
                              Enable
                            </button>
                          )}
                          {isActive && (
                            <button
                              onClick={() => handleExtendBeta(company)}
                              disabled={actingCompanyId === company.id}
                              className="inline-flex items-center gap-1 px-2 h-7 text-xs rounded border border-border hover:bg-muted transition disabled:opacity-60"
                              title="Extend by 7 days"
                            >
                              {actingCompanyId === company.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Clock size={12} />
                              )}
                              +7d
                            </button>
                          )}
                          {isActive && (
                            <button
                              onClick={() => handleConvertToPaid(company)}
                              disabled={actingCompanyId === company.id}
                              className="inline-flex items-center gap-1 px-2 h-7 text-xs rounded border border-border hover:bg-muted transition disabled:opacity-60"
                              title="Convert to paid"
                            >
                              {actingCompanyId === company.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Zap size={12} />
                              )}
                              Paid
                            </button>
                          )}
                          {isActive && (
                            <button
                              onClick={() => handleEndBeta(company)}
                              disabled={actingCompanyId === company.id}
                              className="inline-flex items-center gap-1 px-2 h-7 text-xs rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition disabled:opacity-60"
                              title="End beta immediately"
                            >
                              {actingCompanyId === company.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                '×'
                              )}
                              End
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
    </div>
  );
}