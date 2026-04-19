import { Zap, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY = {
  critical: { icon: Zap,       color: 'text-red-600',   bg: 'bg-red-50 border-red-300',     badge: 'bg-red-100 text-red-700',     label: 'Critical' },
  high:     { icon: ArrowUp,   color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', label: 'High' },
  medium:   { icon: Minus,     color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Medium' },
  low:      { icon: ArrowDown, color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-100 text-blue-700',   label: 'Low' },
};

export default function RecommendedActions({ actions }) {
  if (!actions?.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No actions recommended at this time.</p>;
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...actions].sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));

  return (
    <div className="space-y-2">
      {sorted.map((item, i) => {
        const cfg = PRIORITY[item.priority] || PRIORITY.medium;
        const Icon = cfg.icon;
        return (
          <div key={i} className={cn('flex items-start gap-3 rounded-lg border p-3.5', cfg.bg)}>
            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5', cfg.badge)}>
              <Icon size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', cfg.badge)}>{cfg.label}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{item.action}</p>
              {item.rationale && <p className="text-xs text-muted-foreground mt-0.5">{item.rationale}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}