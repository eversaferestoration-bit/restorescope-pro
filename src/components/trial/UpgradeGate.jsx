import { Link } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';

/**
 * Wraps a feature and either renders children (access granted)
 * or shows a friendly upgrade prompt (access denied).
 *
 * Props:
 *   allowed      — boolean, if true renders children normally
 *   feature      — short label, e.g. "estimate generation"
 *   reason       — optional override message
 *   inline       — if true, shows a compact inline badge instead of full block
 */
export default function UpgradeGate({ allowed, feature, reason, inline = false, children }) {
  if (allowed) return children;

  if (inline) {
    return (
      <Link
        to="/billing"
        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border-2 border-dashed border-primary/40 text-primary text-sm font-semibold hover:bg-primary/5 transition"
      >
        <Lock size={13} /> Upgrade to unlock
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-muted/30 border-2 border-dashed border-border rounded-2xl p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Lock size={22} className="text-primary" />
      </div>
      <div>
        <p className="font-semibold font-display text-base">
          Upgrade to unlock {feature}
        </p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
          {reason || `${feature} is available on paid plans. Start a plan to continue — no commitment required.`}
        </p>
      </div>
      <Link
        to="/billing"
        className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
      >
        <Zap size={14} /> View Plans & Upgrade
      </Link>
    </div>
  );
}