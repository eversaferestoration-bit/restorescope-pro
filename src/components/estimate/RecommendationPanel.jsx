import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Plus, Loader2 } from 'lucide-react';

export default function RecommendationPanel({ serviceType, onAddItem, onClose }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await base44.functions.invoke('generateEstimateRecommendations', {
          service_type: serviceType,
        });
        setRecommendations(res.data.recommendations || []);
      } catch (err) {
        console.error('Failed to load recommendations', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, [serviceType]);

  const handleAddSelected = () => {
    selectedItems.forEach(idx => {
      onAddItem({
        id: crypto.randomUUID(),
        ...recommendations[idx],
      });
    });
    setSelectedItems(new Set());
  };

  const toggleSelection = (idx) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedItems(newSelected);
  };

  return (
    <div className="rounded-xl border p-6 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          AI Recommendations
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recommendations.map((item, idx) => (
              <label key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedItems.has(idx)}
                  onChange={() => toggleSelection(idx)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.category} • {item.unit}</p>
                  <p className="text-xs font-semibold text-primary mt-0.5">${item.unit_cost.toFixed(2)} / {item.unit}</p>
                </div>
              </label>
            ))}
          </div>

          {recommendations.length > 0 && (
            <Button
              onClick={handleAddSelected}
              disabled={selectedItems.size === 0}
              className="w-full gap-2"
              size="sm"
            >
              <Plus size={14} />
              Add {selectedItems.size > 0 ? `${selectedItems.size} Item${selectedItems.size > 1 ? 's' : ''}` : 'Items'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}