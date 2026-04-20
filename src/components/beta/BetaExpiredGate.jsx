import { Link } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';

/**
 * Full-page block shown when beta has expired and no active subscription exists.
 * Used to wrap action areas (create job, generate estimate, export).
 *
 * Props:
 *   action — short label, e.g. "creating jobs", "generating estimates", "exporting documents"
 */
export default function BetaExpiredGate({ action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 bg-muted/30 border-2 border-dashed border-border rounded-2xl p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
        <Lock size={24} className="text-amber-600" />
      </div>
      <div>
        <p className="font-semibold font-display text-base">Your trial has ended</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
          Upgrade to continue using the platform. Your data is safe — {action} requires an active plan.
        </p>
      </div>
      <Link
        to="/billing"
        className="inline-flex items-center gap-2 px-6 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
      >
        <Zap size={14} /> View Plans & Upgrade
      </Link>
    </div>
  );
}