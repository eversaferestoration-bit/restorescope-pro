import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

const STEP_LABELS = {
  account_created: { label: 'Start setup', pct: 10 },
  company_started: { label: 'Continue setup', pct: 25 },
  company_completed: { label: 'Continue setup', pct: 50 },
  role_selected: { label: 'Continue setup', pct: 65 },
  pricing_profile_set: { label: 'Create your first job', pct: 80 },
  first_job_started: { label: 'Finish setup', pct: 90 },
};

export default function FinishSetupCard({ onboardingStatus }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const info = STEP_LABELS[onboardingStatus] || { label: 'Continue setup', pct: 25 };

  return (
    <div className="relative flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-xl px-4 py-4 mb-2">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Sparkles size={17} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold">Finish setting up your workspace</p>
          <span className="text-xs text-muted-foreground shrink-0">{info.pct}% done</span>
        </div>
        <div className="h-1.5 bg-primary/15 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${info.pct}%` }}
          />
        </div>
        <Link
          to="/onboarding"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          {info.label} →
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}