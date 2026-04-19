import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lightbulb, BookOpen, TrendingUp, Tag, Pin, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CATEGORY_ICONS = {
  best_practice: BookOpen,
  negotiation_strategy: TrendingUp,
  documentation: Tag,
  scope_guidance: Lightbulb,
  carrier_insight: TrendingUp,
  pricing: Tag,
  dispute_resolution: BookOpen,
  technical_procedure: BookOpen,
};

const CATEGORY_COLORS = {
  best_practice: 'bg-blue-100 text-blue-700',
  negotiation_strategy: 'bg-purple-100 text-purple-700',
  documentation: 'bg-green-100 text-green-700',
  scope_guidance: 'bg-yellow-100 text-yellow-700',
  carrier_insight: 'bg-orange-100 text-orange-700',
  pricing: 'bg-pink-100 text-pink-700',
  dispute_resolution: 'bg-red-100 text-red-700',
  technical_procedure: 'bg-indigo-100 text-indigo-700',
};

export default function KnowledgePanel({ jobId }) {
  const [expandedId, setExpandedId] = useState(null);

  const { data: suggestions, isLoading, error } = useQuery({
    queryKey: ['knowledge-suggestions', jobId],
    queryFn: () => base44.functions.invoke('suggestKnowledge', { job_id: jobId }),
    enabled: !!jobId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border p-4 text-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error || !suggestions?.data?.suggestions) {
    return (
      <div className="rounded-xl border border-border p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground">No knowledge suggestions available</p>
      </div>
    );
  }

  const { by_category, best_practices, successful_approaches } = suggestions.data.suggestions;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb size={14} className="text-primary" />
        <h3 className="text-sm font-semibold">Knowledge & Best Practices</h3>
      </div>

      {/* Best Practices */}
      {best_practices && best_practices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-900">💡 Top Best Practices</p>
          {best_practices.slice(0, 2).map((item) => (
            <div key={item.id} className="text-xs">
              <p className="font-medium text-blue-900">{item.title}</p>
              <p className="text-blue-700 mt-0.5">{item.content.substring(0, 120)}…</p>
            </div>
          ))}
        </div>
      )}

      {/* Successful Approaches */}
      {successful_approaches && successful_approaches.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-green-900 flex items-center gap-1">
            <TrendingUp size={12} /> Proven Success ({successful_approaches[0].success_count}+ uses)
          </p>
          {successful_approaches.slice(0, 2).map((item) => (
            <div key={item.id} className="text-xs">
              <p className="font-medium text-green-900">{item.title}</p>
              <p className="text-green-700 mt-0.5">{item.content.substring(0, 120)}…</p>
            </div>
          ))}
        </div>
      )}

      {/* All suggestions by category */}
      {by_category && Object.keys(by_category).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Knowledge Base</p>
          {Object.entries(by_category).map(([category, items]) => {
            const Icon = CATEGORY_ICONS[category] || BookOpen;
            const colorClass = CATEGORY_COLORS[category] || 'bg-muted text-muted-foreground';

            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <Icon size={12} />
                  <span className="font-medium text-muted-foreground capitalize">
                    {category.replace(/_/g, ' ')}
                  </span>
                  <Badge variant="outline" className="text-xs">{items.length}</Badge>
                </div>

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-card/50 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="w-full p-2 flex items-start justify-between hover:bg-muted/30 transition text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium line-clamp-1">{item.title}</p>
                          {item.is_pinned && <Pin size={10} className="text-amber-500 shrink-0" />}
                        </div>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {item.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronDown
                        size={12}
                        className={cn(
                          'text-muted-foreground shrink-0 transition-transform',
                          expandedId === item.id && 'rotate-180'
                        )}
                      />
                    </button>

                    {expandedId === item.id && (
                      <div className="px-2 py-2 border-t border-border bg-muted/10">
                        <p className="text-xs text-muted-foreground">{item.content}</p>
                        {item.success_count > 0 && (
                          <p className="text-xs text-green-600 mt-2 font-medium">
                            ✓ Successful in {item.success_count}+ cases
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {!by_category || Object.keys(by_category).length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Build knowledge base with best practices</p>
        </div>
      )}
    </div>
  );
}