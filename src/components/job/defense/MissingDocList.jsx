import { FileX2, FileWarning, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const IMPACT = {
  high:   { icon: FileX2,      color: 'text-red-500',   bg: 'bg-red-50 border-red-200',     label: 'High Impact' },
  medium: { icon: FileWarning, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', label: 'Medium Impact' },
  low:    { icon: FileCheck,   color: 'text-blue-500',  bg: 'bg-blue-50 border-blue-200',   label: 'Low Impact' },
};

export default function MissingDocList({ items }) {
  if (!items?.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No missing documentation identified.</p>;
  }

  const sorted = [...items].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.impact] ?? 1) - (order[b.impact] ?? 1);
  });

  return (
    <div className="space-y-2">
      {sorted.map((item, i) => {
        const cfg = IMPACT[item.impact] || IMPACT.medium;
        const Icon = cfg.icon;
        return (
          <div key={i} className={cn('flex items-start gap-3 rounded-lg border p-3', cfg.bg)}>
            <Icon size={15} className={cn('shrink-0 mt-0.5', cfg.color)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{item.area}</span>
                <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
              </div>
              <p className="text-sm mt-0.5 text-foreground/90">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}