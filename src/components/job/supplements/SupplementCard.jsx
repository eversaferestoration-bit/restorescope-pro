import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, TrendingUp, AlertCircle, DollarSign, Plus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  pending:   'bg-muted text-muted-foreground',
  generated: 'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
};

function ItemGroup({ title, icon: Icon, color, items, renderItem }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className={cn('flex items-center gap-1.5 text-xs font-semibold px-1', color)}>
        <Icon size={12} /> {title} ({items.length})
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="bg-muted/30 rounded-lg px-3 py-2 border border-border text-xs">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SupplementCard({ supplement, onViewDraft }) {
  const [open, setOpen] = useState(false);

  const totalItems = (supplement.missing_scope_items?.length || 0) +
    (supplement.underpriced_items?.length || 0) +
    (supplement.new_damage_items?.length || 0);

  const delta = supplement.supplement_delta || 0;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between px-4 py-3.5 hover:bg-muted/30 transition text-left">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm font-display">Supplement Analysis</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[supplement.status] || 'bg-muted text-muted-foreground')}>
              {supplement.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>{totalItems} findings</span>
            {supplement.created_at && <span>{format(new Date(supplement.created_at), 'MMM d, yyyy h:mm a')}</span>}
            {supplement.created_by && <span>by {supplement.created_by}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={cn('text-base font-bold font-display', delta >= 0 ? 'text-green-600' : 'text-red-500')}>
            {delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Summary */}
          {supplement.analysis_summary && (
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5 border border-border leading-relaxed">
              {supplement.analysis_summary}
            </p>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-2 text-center">
              <p className="text-lg font-bold text-blue-700">{supplement.missing_scope_items?.length || 0}</p>
              <p className="text-xs text-blue-600">Missing Scope</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 text-center">
              <p className="text-lg font-bold text-amber-700">{supplement.underpriced_items?.length || 0}</p>
              <p className="text-xs text-amber-600">Price Corrections</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg px-2.5 py-2 text-center">
              <p className="text-lg font-bold text-red-700">{supplement.new_damage_items?.length || 0}</p>
              <p className="text-xs text-red-600">New Damage</p>
            </div>
          </div>

          {/* Missing scope items */}
          <ItemGroup
            title="Missing Scope"
            icon={Plus}
            color="text-blue-600"
            items={supplement.missing_scope_items}
            renderItem={(item) => (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{item.description}</span>
                  {item.estimated_cost > 0 && (
                    <span className="text-green-600 font-semibold shrink-0">+${((item.quantity || 1) * item.estimated_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  )}
                </div>
                {item.justification && <p className="text-muted-foreground mt-0.5">{item.justification}</p>}
                <div className="flex gap-2 mt-1 text-muted-foreground">
                  <span className="capitalize">{item.category}</span>
                  {item.quantity && item.unit && <span>· {item.quantity} {item.unit}</span>}
                </div>
              </div>
            )}
          />

          {/* Underpriced items */}
          <ItemGroup
            title="Price Corrections"
            icon={DollarSign}
            color="text-amber-600"
            items={supplement.underpriced_items}
            renderItem={(item) => (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{item.description}</span>
                  <div className="text-right shrink-0">
                    <span className="line-through text-muted-foreground mr-1">${item.original_unit_cost?.toFixed(2)}</span>
                    <span className="text-green-600 font-semibold">${item.recommended_unit_cost?.toFixed(2)}/unit</span>
                  </div>
                </div>
                {item.justification && <p className="text-muted-foreground mt-0.5">{item.justification}</p>}
              </div>
            )}
          />

          {/* New damage items */}
          <ItemGroup
            title="New Damage"
            icon={AlertCircle}
            color="text-red-600"
            items={supplement.new_damage_items}
            renderItem={(item) => (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{item.description}</span>
                  {item.estimated_cost > 0 && (
                    <span className="text-green-600 font-semibold shrink-0">+${((item.quantity || 1) * item.estimated_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  )}
                </div>
                {item.justification && <p className="text-muted-foreground mt-0.5">{item.justification}</p>}
                <div className="flex gap-2 mt-1 text-muted-foreground">
                  <span className="capitalize">{item.category}</span>
                  {item.quantity && item.unit && <span>· {item.quantity} {item.unit}</span>}
                </div>
              </div>
            )}
          />

          {/* View draft button */}
          {supplement.supplement_estimate_id && onViewDraft && (
            <button
              onClick={() => onViewDraft(supplement.supplement_estimate_id)}
              className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-primary text-primary text-xs font-semibold hover:bg-accent transition"
            >
              <FileText size={13} /> View Supplement Estimate Draft
            </button>
          )}
        </div>
      )}
    </div>
  );
}