import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, DollarSign, AlertCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, ArrowUpRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function SummaryCard({ label, value, subtext, icon: Icon, color }) {
  // Icon is already imported from lucide-react
  return (
    <div className={cn('rounded-xl border p-4', color || 'bg-card')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold font-display mt-1">{value}</p>
          {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
        </div>
        {Icon && <Icon size={20} className="text-muted-foreground" />}
      </div>
    </div>
  );
}

function OptimizationItem({ item, type }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-2">
          {type === 'pricing' ? (
            item.risk === 'low' ? <CheckCircle size={13} className="text-green-600" /> :
            item.risk === 'medium' ? <AlertTriangle size={13} className="text-amber-600" /> :
            <AlertCircle size={13} className="text-red-600" />
          ) : (
            <TrendingUp size={13} className="text-primary" />
          )}
          <span className="text-xs font-medium">{item.description || item.modifier?.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-green-600">+${item.margin_impact?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          {open ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
        </div>
      </button>
      
      {open && (
        <div className="px-3 py-2.5 border-t border-border space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Current:</span>
            <span className="font-medium">{item.current_value}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Suggested:</span>
            <span className="font-medium text-primary">{item.suggested_value}</span>
          </div>
          <div className="flex items-start gap-2 mt-2">
            <AlertCircle size={11} className="text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{item.justification}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OptimizationPanel({ optimization, estimate }) {
  const qc = useQueryClient();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const { summary, before, after, pricing_optimizations = [], modifier_adjustments = [] } = optimization;

  const handleApply = async () => {
    setApplying(true);
    try {
      // Create new version with optimized line items
      const res = await base44.functions.invoke('approveEstimate', {
        draft_id: estimate.id,
        action: 'new_version',
        apply_optimization: true,
        optimized_data: {
          line_items: optimization.optimized_line_items,
          modifier_total: after.modifier_total,
        },
      });
      
      if (!res.data.error) {
        setApplied(true);
        qc.invalidateQueries(['estimates']);
      }
    } catch (e) {
      console.error('Failed to apply optimization:', e);
    }
    setApplying(false);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Current Total"
          value={`$${before.total.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          icon={DollarSign}
        />
        <SummaryCard
          label="Optimized Total"
          value={`$${after.total.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          icon={TrendingUp}
          color="bg-green-50 border-green-200"
        />
        <SummaryCard
          label="Margin Increase"
          value={`+$${summary.margin_improvement.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext={`+${summary.margin_improvement_pct.toFixed(1)}%`}
          icon={ArrowUpRight}
          color="bg-green-50 border-green-200"
        />
        <SummaryCard
          label="Opportunities"
          value={summary.total_optimizations}
          subtext={`${pricing_optimizations.length} pricing, ${modifier_adjustments.length} modifiers`}
          icon={AlertCircle}
        />
      </div>

      {/* Before vs After Comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border p-4 bg-card">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">BEFORE</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${before.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modifier</span>
              <span>×{before.modifier_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-border mt-2">
              <span>Total</span>
              <span>${before.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-green-200 p-4 bg-green-50">
          <h4 className="text-xs font-semibold text-green-700 mb-3">AFTER</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">${after.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modifier</span>
              <span className="font-semibold">×{after.modifier_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-green-200 mt-2">
              <span className="text-green-700">Total</span>
              <span className="text-green-700">${after.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Optimizations */}
      {pricing_optimizations.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <DollarSign size={12} /> Pricing Optimizations ({pricing_optimizations.length})
          </h4>
          <div className="space-y-2">
            {pricing_optimizations.slice(0, 5).map((item, idx) => (
              <OptimizationItem key={idx} item={item} type="pricing" />
            ))}
            {pricing_optimizations.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+ {pricing_optimizations.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Modifier Adjustments */}
      {modifier_adjustments.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <TrendingUp size={12} /> Missing Modifiers ({modifier_adjustments.length})
          </h4>
          <div className="space-y-2">
            {modifier_adjustments.map((item, idx) => (
              <OptimizationItem key={idx} item={item} type="modifier" />
            ))}
          </div>
        </div>
      )}

      {/* Apply Button */}
      {applied ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle size={15} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">Optimization applied! A new estimate version has been created.</p>
        </div>
      ) : (
        <button
          onClick={handleApply}
          disabled={applying || pricing_optimizations.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
        >
          {applying ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
          {applying ? 'Applying…' : 'Apply Optimization & Create New Version'}
        </button>
      )}
    </div>
  );
}