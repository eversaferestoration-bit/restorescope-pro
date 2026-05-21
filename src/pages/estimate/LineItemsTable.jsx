import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LineItemsTable({ items, onUpdate, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-semibold">Category</th>
            <th className="text-left py-2 px-2 font-semibold">Description</th>
            <th className="text-center py-2 px-2 font-semibold">Unit</th>
            <th className="text-right py-2 px-2 font-semibold">Qty</th>
            <th className="text-right py-2 px-2 font-semibold">Unit Cost</th>
            <th className="text-right py-2 px-2 font-semibold">Total</th>
            <th className="text-center py-2 px-2 font-semibold">Delete</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-b hover:bg-muted/50">
              <td className="py-2 px-2">
                <Input
                  size="sm"
                  value={item.category}
                  onChange={(e) => onUpdate(item.id, { category: e.target.value })}
                  placeholder="e.g., Equipment"
                  className="text-xs"
                />
              </td>
              <td className="py-2 px-2">
                <Input
                  size="sm"
                  value={item.description}
                  onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                  placeholder="e.g., Air movers"
                  className="text-xs"
                />
              </td>
              <td className="py-2 px-2">
                <Input
                  size="sm"
                  value={item.unit}
                  onChange={(e) => onUpdate(item.id, { unit: e.target.value })}
                  placeholder="days"
                  className="text-xs text-center"
                />
              </td>
              <td className="py-2 px-2">
                <Input
                  size="sm"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onUpdate(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                  className="text-xs text-right"
                />
              </td>
              <td className="py-2 px-2">
                <Input
                  size="sm"
                  type="number"
                  value={item.unit_cost}
                  onChange={(e) => onUpdate(item.id, { unit_cost: parseFloat(e.target.value) || 0 })}
                  className="text-xs text-right"
                />
              </td>
              <td className="py-2 px-2 text-right font-semibold">
                ${(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-2 px-2 text-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}