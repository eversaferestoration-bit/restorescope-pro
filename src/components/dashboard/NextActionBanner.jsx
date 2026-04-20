import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, FolderPlus, FileText, Send, Sparkles } from 'lucide-react';

/**
 * Smart next-action nudge shown on the dashboard.
 * Shows nothing once the user is fully activated.
 *
 * Priority order:
 *   1. Onboarding incomplete  → "Continue setup"
 *   2. No jobs                → "Create your first job"
 *   3. Jobs but no estimate   → "Generate your first estimate"
 *   4. Draft but no approval  → "Submit your first estimate for approval"
 *   5. Fully activated        → null (hidden)
 */

const STATES = {
  onboarding: {
    icon: Sparkles,
    color: 'bg-primary/5 border-primary/20',
    iconColor: 'bg-primary/10 text-primary',
    title: 'Finish setting up your workspace',
    desc: 'A few quick steps and you\'ll be ready to run your first job.',
    cta: 'Continue setup',
    to: '/onboarding',
  },
  no_job: {
    icon: FolderPlus,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'bg-blue-100 text-blue-600',
    title: 'Create your first job',
    desc: 'Start tracking a new restoration project — it takes under a minute.',
    cta: 'Create job',
    to: '/jobs/new',
  },
  no_estimate: {
    icon: FileText,
    color: 'bg-amber-50 border-amber-200',
    iconColor: 'bg-amber-100 text-amber-600',
    title: 'Generate your first estimate',
    desc: 'Open your job and let AI build a scope-backed estimate for you.',
    cta: 'Go to jobs',
    to: '/jobs',
  },
  no_approval: {
    icon: Send,
    color: 'bg-green-50 border-green-200',
    iconColor: 'bg-green-100 text-green-600',
    title: 'Submit your first estimate for approval',
    desc: 'Your estimate draft is ready. Submit it to the carrier for review.',
    cta: 'Go to jobs',
    to: '/jobs',
  },
};

export default function NextActionBanner({ userId, companyId, onboardingStatus }) {
  const [state, setState] = useState(null); // null = loading
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    resolve(userId, companyId, onboardingStatus).then(setState);
  }, [userId, companyId, onboardingStatus]);

  if (dismissed || state === null || state === 'done') return null;

  const cfg = STATES[state];
  if (!cfg) return null;

  const Icon = cfg.icon;

  return (
    <div className={`relative flex items-start gap-3 border rounded-xl px-4 py-4 ${cfg.color}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.iconColor}`}>
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{cfg.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">{cfg.desc}</p>
        <Link
          to={cfg.to}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          {cfg.cta} <ArrowRight size={12} />
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground text-xs px-1 transition shrink-0"
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

async function resolve(userId, companyId, onboardingStatus) {
  // 1. Onboarding incomplete
  const incompleteStatuses = ['account_created', 'company_started', 'company_completed', 'role_selected', 'pricing_profile_set', 'first_job_started'];
  if (onboardingStatus && incompleteStatuses.includes(onboardingStatus)) {
    return 'onboarding';
  }

  if (!companyId) return 'onboarding';

  // 2. No jobs at all
  const jobs = await base44.entities.Job.filter({ is_deleted: false }, '-created_date', 1);
  if (jobs.length === 0) return 'no_job';

  // 3. Jobs but no estimate draft
  const estimates = await base44.entities.EstimateDraft.filter({ is_deleted: false }, '-created_date', 1);
  if (estimates.length === 0) return 'no_estimate';

  // 4. Has a draft but none submitted/approved yet
  const submitted = await base44.entities.EstimateDraft.filter({ status: 'submitted', is_deleted: false }, '-created_date', 1);
  const approved = await base44.entities.EstimateDraft.filter({ status: 'approved', is_deleted: false }, '-created_date', 1);
  if (submitted.length === 0 && approved.length === 0) return 'no_approval';

  // Fully activated
  return 'done';
}