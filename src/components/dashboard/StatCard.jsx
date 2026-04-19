import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function StatCard({ label, value, icon: Icon, color = 'text-primary', bg = 'bg-primary/10', to, loading, sublabel, urgent }) {
  const inner = (
    <div className={cn(
      'bg-card rounded-xl border p-4 flex items-start gap-3 transition-all',
      urgent ? 'border-amber-300 bg-amber-50' : 'border-border',
      to && 'hover:shadow-sm cursor-pointer',
    )}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', bg)}>
        <Icon size={17} className={color} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold font-display leading-none mt-1">
          {loading ? <span className="inline-block w-8 h-6 bg-muted rounded animate-pulse" /> : value}
        </p>
        {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}