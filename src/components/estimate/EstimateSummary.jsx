import React from 'react';
import { Input } from '@/components/ui/input';

export default function EstimateSummary({ estimate, onTaxRateChange }) {
  return (
    <div className="rounded-xl border p-6 bg-card space-y-3">
      <h3 className="text-lg font-semibold">Summary</h3>
      
      <div>
        <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
        <p className="text-2xl font-bold text-foreground">${estimate.subtotal.toFixed(2)}</p>
      </div>

      <div className="pt-2 border-t space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm">Tax Rate</label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={Math.round(estimate.tax_rate * 10000) / 100}
              onChange={(e) => onTaxRateChange(parseFloat(e.target.value) / 100)}
              className="w-16 h-8 text-xs text-right"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Tax</p>
          <p className="font-semibold">${estimate.tax.toFixed(2)}</p>
        </div>
      </div>

      <div className="pt-2 border-t">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Total</p>
          <p className="text-3xl font-bold text-primary">${estimate.total.toFixed(2)}</p>
        </div>
      </div>

      <div className="pt-2 border-t text-xs text-muted-foreground">
        <p>Status: <span className="capitalize font-medium">{estimate.status}</span></p>
        {estimate.approved_date && <p>Approved: {new Date(estimate.approved_date).toLocaleDateString()}</p>}
      </div>
    </div>
  );
}