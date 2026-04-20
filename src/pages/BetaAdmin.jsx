import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Copy, Check, FlaskConical, Link2, Calendar, Users, ToggleLeft, ToggleRight, ChevronDown, Trash2 } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';

export default function BetaAdmin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('invites');
  const [copied, setCopied] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Invite form state
  const [inviteForm, setInviteForm] = useState({ label: '', trial_days: 30, max_uses: '', expires_at: '' });

  // Manual beta form
  const [manualForm, setManualForm] = useState({ company_id: '', trial_days: 30 });
  const [activatingManual, setActivatingManual] = useState(false);

  // Expand state for company management
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [extendingDays, setExtendingDays] = useState({});
  const [endingBeta, setEndingBeta] = useState({});
  const [convertingPaid, setConvertingPaid] = useState({});

  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ['beta-invites'],
    queryFn: () => base44.entities.BetaInvite.filter({ is_deleted: false }, '-created_date'),
    enabled: user?.role === 'admin',
  });

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['beta-companies'],
    queryFn: () => base44.entities.Company.filter({ is_beta_user: true, is_deleted: false }, '-created_date'),
    enabled: user?.role === 'admin',
  });

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-semibold">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGenerateInvite = async () => {
    setGeneratingCode(true);
    try {
      await base44.functions.invoke('generateBetaInvite', {
        label: inviteForm.label || undefined,
        trial_days: Number(inviteForm.trial_days) || 30,
        max_uses: inviteForm.max_uses ? Number(inviteForm.max_uses) : undefined,
        expires_at: inviteForm.expires_at || undefined,
      });
      qc.invalidateQueries(['beta-invites']);
      setInviteForm({ label: '', trial_days: 30, max_uses: '', expires_at: '' });
      toast.success('Invite code generated');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to generate invite');
    }
    setGeneratingCode(false);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDeactivate = async (invite) => {
    await base44.entities.BetaInvite.update(invite.id, { is_active: !invite.is_active });
    qc.invalidateQueries(['beta-invites']);
    toast.success(invite.is_active ? 'Invite deactivated' : 'Invite activated');
  };

  const handleManualActivate = async () => {
    if (!manualForm.company_id.trim()) return;
    setActivatingManual(true);
    try {
      const startDate = new Date();
      const endDate = addDays(startDate, Number(manualForm.trial_days) || 30);
      await base44.entities.Company.update(manualForm.company_id.trim(), {
        is_beta_user: true,
        beta_start_date: format(startDate, 'yyyy-MM-dd'),
        beta_end_date: format(endDate, 'yyyy-MM-dd'),
        beta_status: 'active',
      });
      qc.invalidateQueries(['beta-companies']);
      setManualForm({ company_id: '', trial_days: 30 });
      toast.success('Beta access granted');
    } catch (e) {
      toast.error('Failed to activate beta access');
    }
    setActivatingManual(false);
  };

  const getInviteUrl = (code) =>
    `${window.location.origin}/signup?invite=${encodeURIComponent(code)}`;

  const handleExtendBeta = async (companyId, extendDays) => {
    if (!extendDays || extendDays <= 0) return;
    setExtendingDays((s) => ({ ...s, [companyId]: true }));
    try {
      const co = companies.find((c) => c.id === companyId);
      const currentEndDate = co.beta_end_date ? parseISO(co.beta_end_date) : new Date();
      const newEndDate = addDays(currentEndDate, Number(extendDays));
      await base44.entities.Company.update(companyId, {
        beta_end_date: format(newEndDate, 'yyyy-MM-dd'),
      });
      qc.invalidateQueries(['beta-companies']);
      setExpandedCompany(null);
      toast.success(`Extended beta by ${extendDays} days`);
    } catch (e) {
      toast.error('Failed to extend beta');
    }
    setExtendingDays((s) => ({ ...s, [companyId]: false }));
  };

  const handleEndBeta = async (companyId) => {
    setEndingBeta((s) => ({ ...s, [companyId]: true }));
    try {
      await base44.entities.Company.update(companyId, {
        is_beta_user: false,
        beta_status: 'expired',
      });
      qc.invalidateQueries(['beta-companies']);
      setExpandedCompany(null);
      toast.success('Beta access ended');
    } catch (e) {
      toast.error('Failed to end beta');
    }
    setEndingBeta((s) => ({ ...s, [companyId]: false }));
  };

  const handleConvertToPaid = async (companyId) => {
    setConvertingPaid((s) => ({ ...s, [companyId]: true }));
    try {
      await base44.entities.Company.update(companyId, {
        is_beta_user: false,
        beta_status: 'converted_to_paid',
        status: 'active',
      });
      qc.invalidateQueries(['beta-companies']);
      setExpandedCompany(null);
      toast.success('Company converted to paid plan');
    } catch (e) {
      toast.error('Failed to convert to paid');
    }
    setConvertingPaid((s) => ({ ...s, [companyId]: false }));
  };

  const tabs = [
    { key: 'invites', label: 'Invite Codes' },
    { key: 'manual', label: 'Manual Grant' },
    { key: 'companies', label: 'Beta Companies' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <FlaskConical size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display">Beta Access</h1>
          <p className="text-sm text-muted-foreground">Manage beta invites and access grants</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Invite Codes Tab */}
      {activeTab === 'invites' && (
        <div className="space-y-5">
          {/* Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Plus size={14} /> Generate New Invite Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Label (optional)</Label>
                  <Input placeholder="e.g. Early adopter batch" value={inviteForm.label} onChange={(e) => setInviteForm({ ...inviteForm, label: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Trial Days</Label>
                  <Input type="number" min={1} max={365} value={inviteForm.trial_days} onChange={(e) => setInviteForm({ ...inviteForm, trial_days: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Max Uses (blank = unlimited)</Label>
                  <Input type="number" min={1} placeholder="Unlimited" value={inviteForm.max_uses} onChange={(e) => setInviteForm({ ...inviteForm, max_uses: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Expires On (optional)</Label>
                  <Input type="date" value={inviteForm.expires_at} onChange={(e) => setInviteForm({ ...inviteForm, expires_at: e.target.value })} className="h-9 text-sm" />
                </div>
              </div>
              <Button onClick={handleGenerateInvite} disabled={generatingCode} size="sm" className="mt-1">
                {generatingCode ? 'Generating…' : 'Generate Code'}
              </Button>
            </CardContent>
          </Card>

          {/* Invite list */}
          <div className="space-y-3">
            {loadingInvites ? (
              [1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)
            ) : invites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No invite codes yet.</p>
            ) : (
              invites.map((inv) => (
                <Card key={inv.id} className={!inv.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-base font-bold font-mono tracking-wider text-primary">{inv.code}</code>
                          <Badge variant={inv.is_active ? 'default' : 'secondary'} className="text-xs">
                            {inv.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {inv.label && <span className="text-xs text-muted-foreground">{inv.label}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Calendar size={11} /> {inv.trial_days}d trial</span>
                          <span className="flex items-center gap-1"><Users size={11} /> {inv.uses_count || 0}{inv.max_uses ? `/${inv.max_uses}` : ''} uses</span>
                          {inv.expires_at && <span>Expires {format(parseISO(inv.expires_at), 'MMM d, yyyy')}</span>}
                          {inv.created_by && <span>by {inv.created_by}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Copy code */}
                        <button
                          onClick={() => handleCopy(inv.code, `code-${inv.id}`)}
                          className="inline-flex items-center gap-1.5 text-xs px-3 h-8 rounded-lg border border-border hover:bg-muted transition"
                          title="Copy code"
                        >
                          {copied === `code-${inv.id}` ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                          Code
                        </button>
                        {/* Copy link */}
                        <button
                          onClick={() => handleCopy(getInviteUrl(inv.code), `link-${inv.id}`)}
                          className="inline-flex items-center gap-1.5 text-xs px-3 h-8 rounded-lg border border-border hover:bg-muted transition"
                          title="Copy invite link"
                        >
                          {copied === `link-${inv.id}` ? <Check size={12} className="text-green-600" /> : <Link2 size={12} />}
                          Link
                        </button>
                        {/* Toggle */}
                        <button
                          onClick={() => handleDeactivate(inv)}
                          className="inline-flex items-center gap-1.5 text-xs px-3 h-8 rounded-lg border border-border hover:bg-muted transition"
                          title={inv.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {inv.is_active ? <ToggleRight size={14} className="text-primary" /> : <ToggleLeft size={14} />}
                          {inv.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Manual Grant Tab */}
      {activeTab === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Manually Grant Beta Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Enter a Company ID to grant beta access directly, without an invite code.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Company ID *</Label>
                <Input
                  placeholder="Company record ID"
                  value={manualForm.company_id}
                  onChange={(e) => setManualForm({ ...manualForm, company_id: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Trial Days</Label>
                <Input
                  type="number" min={1} max={365}
                  value={manualForm.trial_days}
                  onChange={(e) => setManualForm({ ...manualForm, trial_days: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleManualActivate}
              disabled={activatingManual || !manualForm.company_id.trim()}
              size="sm"
            >
              {activatingManual ? 'Granting…' : 'Grant Beta Access'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Beta Companies Tab */}
      {activeTab === 'companies' && (
        <div className="space-y-3">
          {loadingCompanies ? (
            [1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No beta companies yet.</p>
          ) : (
            companies.map((co) => {
              const daysRemaining = co.beta_end_date
                ? Math.ceil((parseISO(co.beta_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const isExpired = daysRemaining !== null && daysRemaining <= 0;
              const isExpanded = expandedCompany === co.id;

              return (
                <Card key={co.id}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{co.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {daysRemaining !== null && (
                            <span className={isExpired ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                              {isExpired ? 'Expired' : `${daysRemaining} days left`}
                            </span>
                          )}
                          {co.beta_start_date && <span>{format(parseISO(co.beta_start_date), 'MMM d')} →</span>}
                          {co.beta_end_date && <span>{format(parseISO(co.beta_end_date), 'MMM d, yyyy')}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={
                            co.beta_status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : co.beta_status === 'expired'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }
                        >
                          {co.beta_status || 'active'}
                        </Badge>
                        <button
                          onClick={() => setExpandedCompany(isExpanded ? null : co.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border hover:bg-muted transition"
                        >
                          <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded actions */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-border space-y-3">
                        <p className="text-xs text-muted-foreground">ID: <code className="font-mono">{co.id}</code></p>

                        {/* Extend beta */}
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label className="text-xs mb-1 block">Extend by (days)</Label>
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              placeholder="30"
                              id={`extend-${co.id}`}
                              className="h-8 text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const input = document.getElementById(`extend-${co.id}`);
                              const days = Number(input.value);
                              if (days > 0) handleExtendBeta(co.id, days);
                              input.value = '';
                            }}
                            disabled={extendingDays[co.id]}
                            className="h-8"
                          >
                            {extendingDays[co.id] ? 'Extending…' : 'Extend'}
                          </Button>
                        </div>

                        {/* Convert to paid */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConvertToPaid(co.id)}
                          disabled={convertingPaid[co.id]}
                          className="w-full h-8 text-sm"
                        >
                          {convertingPaid[co.id] ? 'Converting…' : 'Convert to Paid'}
                        </Button>

                        {/* End beta early */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleEndBeta(co.id)}
                          disabled={endingBeta[co.id]}
                          className="w-full h-8 text-sm"
                        >
                          {endingBeta[co.id] ? 'Ending…' : 'End Beta Early'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}