/**
 * UserRepairTool
 * Admin-only component for repairing partial user records.
 * Safe: never deletes data, never creates duplicates.
 * Shown on the Users/Team page for Owner_Admin role.
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizeEmail, repairMissingUserProfile } from '@/lib/authRepair';
import { Search, Wrench, CheckCircle2, AlertCircle, RefreshCw, User } from 'lucide-react';

const INCOMPLETE_STATUSES = ['account_created', 'company_started', 'company_completed', 'role_selected', 'pricing_profile_set'];

function StatusBadge({ status }) {
  const incomplete = INCOMPLETE_STATUSES.includes(status);
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${incomplete ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
      {status?.replace(/_/g, ' ') || 'unknown'}
    </span>
  );
}

export default function UserRepairTool({ companyId }) {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null); // { profile, company, authUser, issues }
  const [repairing, setRepairing] = useState(false);
  const [repairLog, setRepairLog] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const log = (msg) => setRepairLog((prev) => [...prev, msg]);

  const handleSearch = async () => {
    if (!email.trim()) return;
    setSearching(true);
    setResult(null);
    setRepairLog([]);
    setFeedback(null);

    const normalized = normalizeEmail(email);
    try {
      const [profiles, companies] = await Promise.all([
        base44.entities.UserProfile.filter({ email: normalized, is_deleted: false }),
        base44.entities.Company.filter({ created_by: normalized, is_deleted: false }),
      ]);

      const profile = profiles[0] || null;
      const company = companies[0] || null;

      const issues = [];
      if (!profile) issues.push('No UserProfile found for this email.');
      if (!company) issues.push('No Company found created by this email.');
      if (profile && INCOMPLETE_STATUSES.includes(profile.onboarding_status)) {
        issues.push(`Onboarding incomplete: "${profile.onboarding_status}".`);
      }
      if (profile && !profile.company_id) {
        issues.push('UserProfile has no company_id linked.');
      }

      setResult({ profile, company, issues });
    } catch (e) {
      setFeedback({ type: 'error', message: 'Search failed. Check the email and try again.' });
    } finally {
      setSearching(false);
    }
  };

  const handleRepair = async () => {
    if (!result) return;
    setRepairing(true);
    setRepairLog([]);
    setFeedback(null);

    const { profile, company } = result;
    const normalized = normalizeEmail(email);

    try {
      // 1. Repair missing UserProfile if company exists
      if (!profile && company) {
        log('Creating missing UserProfile…');
        // We need a minimal user object — use email as stand-in
        const fakeUser = { id: null, email: normalized, full_name: '' };
        // Try to find the auth user id via existing profiles with same company
        const companyProfiles = await base44.entities.UserProfile.filter({ company_id: company.id, is_deleted: false });
        if (companyProfiles.length > 0) {
          // Profile for company exists — this user may have a different user_id
          log(`Found ${companyProfiles.length} existing profile(s) for this company. Cannot auto-repair without auth user ID.`);
          log('Please ask the user to log in — ProtectedRoute will auto-repair on next login.');
        } else {
          log('No existing profiles for this company. User must log in first for auto-repair.');
        }
      }

      // 2. Repair incomplete onboarding status
      if (profile && INCOMPLETE_STATUSES.includes(profile.onboarding_status)) {
        log('Marking onboarding as completed…');
        await base44.entities.UserProfile.update(profile.id, {
          onboarding_status: 'onboarding_completed',
          current_onboarding_step: 6,
          onboarding_completed_at: new Date().toISOString(),
        });
        log('✓ Onboarding status repaired.');
      }

      // 3. Repair missing company_id on profile
      if (profile && !profile.company_id && company) {
        log('Linking company to UserProfile…');
        await base44.entities.UserProfile.update(profile.id, { company_id: company.id });
        log('✓ company_id linked to profile.');
      }

      // 4. If no issues detected
      if (result.issues.length === 0) {
        log('No issues found — account looks healthy.');
      }

      setFeedback({ type: 'success', message: 'Repair complete. Ask the user to log in again to verify.' });
      // Re-run search to show updated state
      await handleSearch();
    } catch (e) {
      setFeedback({ type: 'error', message: e?.message || 'Repair failed. Please try again.' });
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Wrench size={15} className="text-primary" />
        <h3 className="text-sm font-semibold">User Account Repair Tool</h3>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Admin Only</span>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Search by email to diagnose and safely repair partial account states. No data is deleted.
        </p>

        {/* Email search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="user@example.com"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !email.trim()}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
          >
            {searching ? <RefreshCw size={14} className="animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {/* Issues */}
            {result.issues.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-700">Issues detected:</p>
                {result.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle size={12} className="shrink-0 mt-0.5 text-amber-600" />
                    {issue}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle2 size={12} className="text-green-600" />
                Account looks healthy — no issues found.
              </div>
            )}

            {/* Profile info */}
            <div className="text-xs space-y-1.5 border border-border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <User size={12} className="text-muted-foreground" />
                <span className="font-semibold">Account State</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UserProfile</span>
                <span className={result.profile ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                  {result.profile ? 'Found' : 'Missing'}
                </span>
              </div>
              {result.profile && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Onboarding status</span>
                  <StatusBadge status={result.profile.onboarding_status} />
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company</span>
                <span className={result.company ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                  {result.company ? result.company.name : 'Missing'}
                </span>
              </div>
              {result.profile && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">company_id linked</span>
                  <span className={result.profile.company_id ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                    {result.profile.company_id ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
            </div>

            {/* Repair button */}
            {result.issues.length > 0 && (
              <button
                onClick={handleRepair}
                disabled={repairing}
                className="w-full h-9 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {repairing ? <><RefreshCw size={13} className="animate-spin" /> Repairing…</> : <><Wrench size={13} /> Repair Account</>}
              </button>
            )}

            {/* Repair log */}
            {repairLog.length > 0 && (
              <div className="text-xs bg-muted/40 border border-border rounded-lg p-3 space-y-1 font-mono">
                {repairLog.map((line, i) => <div key={i} className="text-muted-foreground">{line}</div>)}
              </div>
            )}
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {feedback.type === 'success'
              ? <CheckCircle2 size={13} className="text-green-600 shrink-0" />
              : <AlertCircle size={13} className="text-red-600 shrink-0" />
            }
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}