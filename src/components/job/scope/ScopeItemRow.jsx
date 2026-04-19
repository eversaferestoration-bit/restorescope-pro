import { Check, X, Trash2, Sparkles, Cpu, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = {
  containment: 'bg-purple-100 text-purple-700',
  demolition: 'bg-red-100 text-red-700',
  drying: 'bg-blue-100 text-blue-700',
  cleaning: 'bg-green-100 text-green-700',
  deodorization: 'bg-amber-100 text-amber-700',
  hepa: 'bg-teal-100 text-teal-700',
  contents: 'bg-orange-100 text-orange-700',
  documentation: 'bg-muted text-muted-foreground',
};

const SOURCE_ICON = {
  rules_engine: { icon: Cpu, label: 'Rule', cls: 'text-muted-foreground' },
  ai_suggested: { icon: Sparkles, label: 'AI', cls: 'text-primary' },
  manual: { icon: User, label: 'Manual', cls: 'text-muted-foreground' },
};

export default function ScopeItemRow({ item, onConfirm, onReject, onDelete, readOnly }) {
  const src = SOURCE_ICON[item.source] || SOURCE_ICON.manual;
  const SrcIcon = src.icon;
  const isConfirmed = item.status === 'confirmed';
  const isRejected = item.status === 'rejected';

  return (
    <div className={cn(
      'flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all',
      isConfirmed ? 'bg-green-50/60 border-green-200' :
      isRejected ? 'bg-muted/40 border-border opacity-60' :
      'bg-card border-border hover:border-primary/30'
    )}>
      {/* Status indicator */}
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <SrcIcon size={11} className={src.cls} title={src.label} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize', CATEGORY_COLORS[item.category] || 'bg-muted text-muted-foreground')}>
            {item.category}
          </span>
          {item.source === 'ai_suggested' && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">AI only</span>
          )}
          {isConfirmed && <span className="text-xs text-green-600 font-medium">✓ Confirmed</span>}
        </div>
        <p className={cn('text-sm mt-0.5', isRejected && 'line-through')}>{item.description}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
          {item.notes && <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">{item.notes}</span>}
          {item.confidence != null && item.confidence < 0.8 && (
            <span className="text-xs text-amber-600">{Math.round(item.confidence * 100)}% confidence</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!readOnly && !isRejected && (
        <div className="flex gap-1 shrink-0">
          {!isConfirmed && (
            <button onClick={() => onConfirm(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition" title="Confirm">
              <Check size={13} />
            </button>
          )}
          <button onClick={() => isConfirmed ? onDelete(item) : onReject(item)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition" title={isConfirmed ? 'Remove' : 'Reject'}>
            {isConfirmed ? <Trash2 size={13} /> : <X size={13} />}
          </button>
        </div>
      )}
    </div>
  );
}