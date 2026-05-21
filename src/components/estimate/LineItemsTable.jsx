import React from 'react';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function LineItemsTable({ items, onUpdate, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Category</th>
            <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Description</th>
            <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Unit</th>
            <th className="text-right py-3 px-3 font-semibold text-muted-foreground">Qty</th>
            <th className="text-right py-3 px-3 font-semibold text-muted-foreground">Unit Cost</th>
            <th className="text-right py-3 px-3 font-semibold text-muted-foreground">Total</th>
            <th className="text-center py-3 px-3 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b hover:bg-muted/50">
              <td className="py-3 px-3">
                <Input
                  size="sm"
                  placeholder="Equipment"
                  value={item.category}
                  onChange={(e) => onUpdate(item.id, { category: e.target.value })}
                  className="h-8 text-xs"
                />
              </td>
              <td className="py-3 px-3">
                <Input
                  size="sm"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                  className="h-8 text-xs"
                />
              </td>
              <td className="py-3 px-3">
                <Input
                  size="sm"
                  placeholder="hour"
                  value={item.unit}
                  onChange={(e) => onUpdate(item.id, { unit: e.target.value })}
                  className="h-8 text-xs"
                />
              </td>
              <td className="py-3 px-3">
                <Input
                  size="sm"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onUpdate(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs text-right"
                />
              </td>
              <td className="py-3 px-3">
                <Input
                  size="sm"
                  type="number"
                  value={item.unit_cost}
                  onChange={(e) => onUpdate(item.id, { unit_cost: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs text-right"
                  placeholder="0.00"
                />
              </td>
              <td className="py-3 px-3 text-right font-semibold">
                ${(item.total || 0).toFixed(2)}
              </td>
              <td className="py-3 px-3 text-center">
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-destructive hover:bg-destructive/10 rounded p-1"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No line items yet. Click "Add Item" to start.
        </div>
      )}
    </div>
  );
}