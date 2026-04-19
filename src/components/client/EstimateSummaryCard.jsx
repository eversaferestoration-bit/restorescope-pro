import { DollarSign, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function EstimateSummaryCard({ job, estimate }) {
  if (!estimate || estimate.status !== 'approved') {
    return null;
  }

  const lineItemsByCategory = {};
  (estimate.line_items || []).forEach((item) => {
    if (!lineItemsByCategory[item.category]) {
      lineItemsByCategory[item.category] = [];
    }
    lineItemsByCategory[item.category].push(item);
  });

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {job.job_number || `Job #${job.id?.slice(-6)}`}
              </p>
              <h3 className="font-semibold">Estimate Summary</h3>
            </div>
            <Badge className="bg-green-100 text-green-700">Approved</Badge>
          </div>

          {/* Line items by category */}
          <div className="space-y-3">
            {Object.entries(lineItemsByCategory).map(([category, items]) => (
              <div key={category} className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground capitalize mb-2">
                  {category}
                </p>
                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">
                          {item.quantity && `${item.quantity} ${item.unit}`} {item.description}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-foreground ml-2 shrink-0">
                        ${item.line_total?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-3 border-t border-border space-y-2">
            {estimate.subtotal > 0 && (
              <div className="flex justify-between text-sm">
                <p className="text-muted-foreground">Subtotal</p>
                <p className="font-medium">${estimate.subtotal.toLocaleString()}</p>
              </div>
            )}
            {estimate.modifier_total && estimate.modifier_total !== 1.0 && (
              <div className="flex justify-between text-sm">
                <p className="text-muted-foreground">Modifiers</p>
                <p className="font-medium">×{estimate.modifier_total.toFixed(2)}</p>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <p className="font-semibold">Total Approved Amount</p>
              <p className="text-lg font-bold text-green-600">
                ${estimate.total?.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Approval date */}
          {estimate.approved_at && (
            <div className="text-xs text-muted-foreground">
              Approved {format(new Date(estimate.approved_at), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}