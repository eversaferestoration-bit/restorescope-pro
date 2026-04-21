/**
 * AccountRepairTool
 * Admin-only tool to detect and repair partial user/profile records.
 * Safe: never deletes data, never creates duplicates.
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeEmail, repairMissingUserProfile } from '@/lib/authRepair';
import { Search, ShieldAlert, CheckCircle2, AlertCircle, Wrench, User, Building2, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const INCOMPLETE_STATUSES = [
  'account_created', 'company_started', 'company_completed',
  'role_selected', 'pricing_profile_set',
];

function StateTag({ state }) {
  const map = {
    ok:                    { label: 'OK',                  cls: 'bg-green-100 text-green-700' },
    no_profile:            { label: 'No Profile',          cls: 'bg-red-100 text-red-700' },
    no_company:            { label: 'No Company',          cls: 'bg-orange-100 text-orange-700' },
    onboarding_incomplete: { label: 'Onboarding Partial',  cls: 'bg-yellow-100 text-yellow-700' },
  };
  const { label, cls } = map[state] || { label: state, cls: 'bg-muted text-muted-foreground' };
  return <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cls)}>{label}</span>;
}

export default function AccountRepairTool({ currentUser }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(null);
  const [repairLog, setRepairLog] = useState([]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6 flex flex-col items-center gap-2 text-center">
        <ShieldAlert size={28} className="text-muted-foreground" />
        <p className="text-sm font-semibold">Admin access required</p>
      </div>
    );
  }

  const addLog = (msg, type = 'info') => {
    setRepairLog(prev => [...prev, { msg, type, ts: new Date().toISOString() }]);
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setResults(null);
    setRepairLog([]);

    try {
      const email = normalizeEmail(search);
      addLog(`Searching for: ${email}`);

      // Fetch UserProfiles matching this email
      const profiles = await base44.entities.UserProfile.filter(
        { email, is_deleted: false }, '-created_date', 10
      ).catch(() => []);

      addLog(`Found ${profiles.length} UserProfile(s)`);

      const enriched = await Promise.all(profiles.map(async (p) => {
        let company = null;
        if (p.company_id) {
          const cos = await base44.entities.Company.filter(
            { id: p.company_id, is_deleted: false }, '-created_date', 1
          ).catch(() => []);
          company = cos[0] || null;
        }

        let state = 'ok';
        if (!company) state = 'no_company';
        else if (INCOMPLETE_STATUSES.includes(p.onboarding_status)) state = 'onboarding_incomplete';

        return { profile: p, company, state };
      }));

      // Also look for orphaned companies (no profile linked)
      const companiesByEmail = await base44.entities.Company.filter(
        { created_by: email, is_deleted: false }, '-created_date', 10
      ).catch(() => []);

      // Find companies that have no matching profile
      const profileCompanyIds = new Set(profiles.map(p => p.company_id).filter(Boolean));
      const orphanedCompanies = companiesByEmail.filter(c => !profileCompanyIds.has(c.id));
      addLog(`Found ${orphanedCompanies.length} orphaned company record(s)`);

      setResults({ email, enriched, orphanedCompanies });
    } catch (e) {
      addLog(`Search failed: ${e?.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOnboardingComplete = async (profile) => {
    setRepairing(profile.id);
    addLog(`Marking onboarding complete for profile ${profile.id}…`);
    try {
      await base44.entities.UserProfile.update(profile.id, {
        onboarding_status: 'onboarding_completed',
        current_onboarding_step: 6,
        onboarding_completed_at: new Date().toISOString(),
      });
      addLog(`✓ Onboarding marked complete`, 'success');
      // Refresh
      await handleSearch();
    } catch (e) {
      addLog(`✗ Failed: ${e?.message}`, 'error');
    } finally {
      setRepairing(null);
    }
  };

  const handleRepairMissingProfile = async (company) => {
    setRepairing(company.id);
    addLog(`Creating UserProfile linked to company ${company.id}…`);
    try {
      // Check no profile already exists for this user_id
      const existing = await base44.entities.UserProfile.filter(
        { company_id: company.id, is_deleted: false }, '-created_date', 1
      ).catch(() => []);

      if (existing.length > 0) {
        addLog(`⚠ Profile already exists (id: ${existing[0].id}) — skipping`, 'warn');
        setRepairing(null);
        return;
      }

      const profile = await base44.entities.UserProfile.create({
        user_id: company.created_by || results.email,
        company_id: company.id,
        email: results.email,
        full_name: '',
        role: 'admin',
        onboarding_status: 'onboarding_completed',
        current_onboarding_step: 6,
        is_deleted: false,
      });
      addLog(`✓ UserProfile created: ${profile.id}`, 'success');
      await handleSearch();
    } catch (e) {
      addLog(`✗ Failed: ${e?.message}`, 'error');
    } finally {
      setRepairing(null);
    }
  };

  const handleResetOnboarding = async (profile) => {
    setRepairing(`reset-${profile.id}`);
    addLog(`Resetting onboarding for profile ${profile.id} to step 1…`);
    try {
      await base44.entities.UserProfile.update(profile.id, {
        onboarding_status: 'account_created',
        current_onboarding_step: 1,
      });
      addLog(`✓ Onboarding reset — user will resume from step 1`, 'success');
      await handleSearch();
    } catch (e) {
      addLog(`✗ Failed: ${e?.message}`, 'error');
    } finally {
      setRepairing(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by user email…"
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !search.trim()}
          className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* UserProfile records */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <User size={12} /> UserProfile Records ({results.enriched.length})
            </h3>
            {results.enriched.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No UserProfile records found for this email.</p>
            ) : results.enriched.map(({ profile, company, state }) => (
              <div key={profile.id} className="bg-card border border-border rounded-xl p-4 space-y-3 mb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground font-mono">Profile: {profile.id}</p>
                    <p className="text-xs text-muted-foreground">Status: <span className="font-medium text-foreground">{profile.onboarding_status || '—'}</span></p>
                    <p className="text-xs text-muted-foreground">Company ID: <span className="font-mono text-foreground">{profile.company_id || '—'}</span></p>
                    {company && <p className="text-xs text-muted-foreground">Company: <span className="font-medium text-foreground">{company.name}</span></p>}
                  </div>
                  <StateTag state={state} />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                  {state === 'onboarding_incomplete' && (
                    <button
                      onClick={() => handleMarkOnboardingComplete(profile)}
                      disabled={!!repairing}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium transition disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} />
                      {repairing === profile.id ? 'Repairing…' : 'Mark Onboarding Complete'}
                    </button>
                  )}
                  {state === 'onboarding_incomplete' && (
                    <button
                      onClick={() => handleResetOnboarding(profile)}
                      disabled={!!repairing}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-medium transition disabled:opacity-50"
                    >
                      <Wrench size={12} />
                      {repairing === `reset-${profile.id}` ? 'Resetting…' : 'Reset to Onboarding Step 1'}
                    </button>
                  )}
                  {state === 'no_company' && (
                    <p className="text-xs text-muted-foreground italic">Company is missing — user needs to re-complete company setup via onboarding.</p>
                  )}
                  {state === 'ok' && (
                    <p className="text-xs text-green-700 flex items-center gap-1"><CheckCircle2 size={12} /> Account is healthy</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Orphaned companies */}
          {results.orphanedCompanies.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Building2 size={12} /> Orphaned Companies (no linked UserProfile)
              </h3>
              {results.orphanedCompanies.map((company) => (
                <div key={company.id} className="bg-card border border-orange-200 rounded-xl p-4 space-y-3 mb-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{company.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">ID: {company.id}</p>
                    <p className="text-xs text-muted-foreground">Created by: {company.created_by}</p>
                  </div>
                  <div className="pt-1 border-t border-border">
                    <button
                      onClick={() => handleRepairMissingProfile(company)}
                      disabled={!!repairing}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs font-medium transition disabled:opacity-50"
                    >
                      <Wrench size={12} />
                      {repairing === company.id ? 'Creating…' : 'Create Missing UserProfile'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Repair log */}
      {repairLog.length > 0 && (
        <div className="bg-muted/40 rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ClipboardList size={12} /> Repair Log
          </h3>
          <div className="space-y-1 font-mono text-xs">
            {repairLog.map((entry, i) => (
              <p key={i} className={cn(
                entry.type === 'success' ? 'text-green-700' :
                entry.type === 'error' ? 'text-destructive' :
                entry.type === 'warn' ? 'text-amber-700' :
                'text-muted-foreground'
              )}>
                [{format(parseISO(entry.ts), 'HH:mm:ss')}] {entry.msg}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}