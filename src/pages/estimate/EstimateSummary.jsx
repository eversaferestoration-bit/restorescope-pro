import { Input } from '@/components/ui/input';

export default function EstimateSummary({ subtotal, tax, total, tax_rate, onTaxRateChange }) {
  return (
    <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
      <h3 className="font-semibold text-foreground text-sm">Summary</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal:</span>
          <span className="font-semibold">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <label className="text-muted-foreground">Tax Rate:</label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={(tax_rate * 100).toFixed(1)}
              onChange={(e) => onTaxRateChange(parseFloat(e.target.value) / 100 || 0)}
              className="w-16 text-xs text-right"
            />
            <span className="text-xs">%</span>
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax:</span>
          <span className="font-semibold">${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div className="border-t pt-2 flex justify-between items-center">
          <span className="font-semibold text-foreground">Total:</span>
          <span className="text-xl font-bold text-primary">${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}