import { Link } from 'react-router-dom';
import { Zap, Lock, AlertTriangle, Clock } from 'lucide-react';

/**
 * Subtle inline upgrade nudge — no popups, no blocking.
 *
 * variant:
 *   'trial'   — near expiration (amber)
 *   'limit'   — usage limit hit (orange)
 *   'premium' — trying a premium feature (blue)
 *   'expired' — trial ended (red)
 */
const VARIANTS = {
  trial:   { icon: Clock,         bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-800', btn: 'bg-amber-600 hover:bg-amber-700' },
  limit:   { icon: AlertTriangle, bg: 'bg-orange-50 border-orange-200', text: 'text-orange-800', btn: 'bg-orange-600 hover:bg-orange-700' },
  premium: { icon: Lock,          bg: 'bg-blue-50 border-blue-200',    text: 'text-blue-800',  btn: 'bg-blue-600 hover:bg-blue-700' },
  expired: { icon: AlertTriangle, bg: 'bg-red-50 border-red-200',      text: 'text-red-800',   btn: 'bg-red-600 hover:bg-red-700' },
};

export default function UpgradeNudge({ variant = 'trial', message, cta = 'Upgrade', className = '' }) {
  const v = VARIANTS[variant] || VARIANTS.trial;
  const Icon = v.icon;

  return (
    <div className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 ${v.bg} ${className}`}>
      <Icon size={14} className={`${v.text} shrink-0`} />
      <p className={`text-xs flex-1 font-medium ${v.text}`}>{message}</p>
      <Link
        to="/billing"
        className={`shrink-0 inline-flex items-center gap-1 text-white text-xs font-semibold px-3 h-7 rounded-md transition ${v.btn}`}
      >
        <Zap size={11} /> {cta}
      </Link>
    </div>
  );
}