import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

// Each checklist item: label, how to check completion, where to go
const ITEMS = [
  {
    key: 'company_setup',
    label: 'Complete company setup',
    to: '/onboarding',
    actionLabel: 'Set up company',
  },
  {
    key: 'pricing_profile',
    label: 'Set default pricing profile',
    to: '/pricing-profiles',
    actionLabel: 'Add pricing',
  },
  {
    key: 'first_job',
    label: 'Create first job',
    to: '/jobs/new',
    actionLabel: 'Create job',
  },
  {
    key: 'first_room',
    label: 'Add first room to a job',
    to: '/jobs',
    actionLabel: 'Open a job',
  },
  {
    key: 'first_photo',
    label: 'Upload first photo',
    to: '/jobs',
    actionLabel: 'Upload photos',
  },
  {
    key: 'first_estimate',
    label: 'Generate first estimate draft',
    to: '/jobs',
    actionLabel: 'Generate estimate',
  },
];

async function computeCheckedKeys(userId, companyId) {
  const checked = new Set();

  // 1. Company setup — based on onboarding_status
  const profiles = await base44.entities.UserProfile.filter({ user_id: userId, is_deleted: false });
  const profile = profiles[0];
  if (profile?.onboarding_status && profile.onboarding_status !== 'account_created' && profile.onboarding_status !== 'company_started') {
    checked.add('company_setup');
  }

  if (!companyId) return checked;

  // 2. Pricing profile
  const pricing = await base44.entities.PricingProfile.filter({ company_id: companyId, is_deleted: false });
  if (pricing.length > 0) checked.add('pricing_profile');

  // 3. First job
  const jobs = await base44.entities.Job.filter({ is_deleted: false }, '-created_date', 1);
  if (jobs.length > 0) {
    checked.add('first_job');

    // 4. First room (requires a job)
    const jobId = jobs[0].id;
    const rooms = await base44.entities.Room.filter({ job_id: jobId, is_deleted: false });
    if (rooms.length > 0) checked.add('first_room');

    // 5. First photo (requires a job)
    const photos = await base44.entities.Photo.filter({ job_id: jobId, is_deleted: false });
    if (photos.length > 0) checked.add('first_photo');

    // 6. First estimate draft
    const estimates = await base44.entities.EstimateDraft.filter({ job_id: jobId, is_deleted: false });
    if (estimates.length > 0) checked.add('first_estimate');
  }

  return checked;
}

export default function ActivationChecklist({ userId, companyId, defaultCollapsed = false }) {
  const [checkedKeys, setCheckedKeys] = useState(null); // null = loading
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('activation_checklist_dismissed') === 'true';
  });

  useEffect(() => {
    if (!userId) return;
    computeCheckedKeys(userId, companyId)
      .then(setCheckedKeys)
      .catch(() => setCheckedKeys(new Set()));
  }, [userId, companyId]);

  const handleDismiss = () => {
    localStorage.setItem('activation_checklist_dismissed', 'true');
    setDismissed(true);
  };

  // Expose a way to reopen (called from outside via localStorage)
  useEffect(() => {
    const handleReopen = () => {
      localStorage.removeItem('activation_checklist_dismissed');
      setDismissed(false);
      setCollapsed(false);
    };
    window.addEventListener('reopen_activation_checklist', handleReopen);
    return () => window.removeEventListener('reopen_activation_checklist', handleReopen);
  }, []);

  if (dismissed) return null;
  if (checkedKeys === null) return null; // loading — silent

  const completedCount = ITEMS.filter(i => checkedKeys.has(i.key)).length;
  const totalCount = ITEMS.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  // Auto-hide once all done (after a brief moment)
  if (allDone) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition select-none"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Rocket size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Get started checklist</p>
            <span className="text-xs font-medium text-primary shrink-0">{completedCount}/{totalCount} done</span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {collapsed
            ? <ChevronDown size={14} className="text-muted-foreground" />
            : <ChevronUp size={14} className="text-muted-foreground" />
          }
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
            title="Dismiss checklist"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Items list */}
      {!collapsed && (
        <div className="divide-y divide-border border-t border-border">
          {ITEMS.map((item) => {
            const done = checkedKeys.has(item.key);
            return (
              <div
                key={item.key}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 transition',
                  done ? 'bg-muted/20' : 'hover:bg-muted/20'
                )}
              >
                {done
                  ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  : <Circle size={16} className="text-muted-foreground shrink-0" />
                }
                <span className={cn('text-sm flex-1', done && 'line-through text-muted-foreground')}>
                  {item.label}
                </span>
                {!done && (
                  <Link
                    to={item.to}
                    className="text-xs font-semibold text-primary hover:underline shrink-0"
                  >
                    {item.actionLabel} →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}