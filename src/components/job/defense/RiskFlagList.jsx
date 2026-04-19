import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY = {
  high:   { icon: AlertTriangle, color: 'text-red-500',   bg: 'bg-red-50 border-red-200',     dot: 'bg-red-500' },
  medium: { icon: AlertCircle,   color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  low:    { icon: Info,          color: 'text-blue-500',  bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-500' },
};

export default function RiskFlagList({ flags }) {
  if (!flags?.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No risk flags identified — great job!</p>;
  }

  const sorted = [...flags].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 1) - (order[b.severity] ?? 1);
  });

  return (
    <div className="space-y-2">
      {sorted.map((flag, i) => {
        const cfg = SEVERITY[flag.severity] || SEVERITY.medium;
        const Icon = cfg.icon;
        return (
          <div key={i} className={cn('flex items-start gap-3 rounded-lg border p-3', cfg.bg)}>
            <Icon size={15} className={cn('shrink-0 mt-0.5', cfg.color)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold capitalize">{flag.category}</span>
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
                <span className="text-xs capitalize font-medium text-muted-foreground">{flag.severity} severity</span>
              </div>
              <p className="text-sm mt-0.5 text-foreground/90">{flag.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}