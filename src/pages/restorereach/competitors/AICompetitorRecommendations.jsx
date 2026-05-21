import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { Sparkles, Loader2, ArrowUpRight, RefreshCw } from 'lucide-react';

const ACTION_ICONS = {
  posts: '📝',
  reviews: '⭐',
  city: '📍',
  pages: '📄',
  photos: '📸',
  speed: '⚡',
  services: '🔧',
};

function getIcon(rec) {
  const text = rec.toLowerCase();
  if (text.includes('post')) return ACTION_ICONS.posts;
  if (text.includes('review')) return ACTION_ICONS.reviews;
  if (text.includes('city') || text.includes('area') || text.includes('local')) return ACTION_ICONS.city;
  if (text.includes('page')) return ACTION_ICONS.pages;
  if (text.includes('photo') || text.includes('image')) return ACTION_ICONS.photos;
  if (text.includes('service')) return ACTION_ICONS.services;
  return ACTION_ICONS.speed;
}

export default function AICompetitorRecommendations({ competitors, myScore, profile }) {
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState(null);

  const generate = async () => {
    setLoading(true);
    try {
      const competitorSummary = competitors.slice(0, 5).map(c =>
        `- ${c.competitor_name} (${c.city || 'unknown city'}): visibility ${c.visibility_score || 0}/100, ${c.google_review_count || 0} reviews @ ${c.google_rating || 'N/A'}★, posts ${c.estimated_post_frequency}, weaknesses: ${c.weaknesses?.join(', ') || 'none listed'}`
      ).join('\n');

      const prompt = `You are a local SEO and marketing expert for restoration companies. 
      
My company: "${profile?.company_name || 'My Company'}" in ${profile?.city || 'our market'}.
My visibility score: ${myScore}/100.
My competitors:
${competitorSummary}

Analyze the competitive landscape and provide exactly 6 specific, actionable recommendations to outrank these competitors. 
Focus on: GBP post frequency, review count gaps, underserved cities, missing local pages, photo strategy, and service expansion.

Return ONLY valid JSON:
{
  "summary": "2-sentence competitive analysis overview",
  "recommendations": [
    { "title": "Short action title", "description": "Specific actionable advice (1-2 sentences)", "priority": "high|medium|low", "impact": "Estimated impact in plain English" },
    ...6 items
  ],
  "biggest_gap": "The #1 gap vs competitors in 1 sentence",
  "easiest_win": "The fastest/easiest win available in 1 sentence"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string' },
                  impact: { type: 'string' },
                },
              },
            },
            biggest_gap: { type: 'string' },
            easiest_win: { type: 'string' },
          },
        },
      });
      setRecs(result);
    } catch (err) {
      toast({ title: 'AI analysis failed', description: err?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const PRIORITY_CONFIG = {
    high:   { color: '#ef4444', bg: '#ef444420', label: 'High' },
    medium: { color: '#f59e0b', bg: '#f59e0b20', label: 'Medium' },
    low:    { color: '#10b981', bg: '#10b98120', label: 'Low' },
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: '#e05a1c' }} />
          <span className="text-sm font-semibold text-white">AI Competitive Recommendations</span>
        </div>
        {recs && (
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition"
            style={{ background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
            <RefreshCw size={11} /> Refresh
          </button>
        )}
      </div>

      <div className="p-5">
        {!recs && !loading && (
          <div className="text-center py-6">
            <Sparkles size={28} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
            <p className="text-sm font-semibold text-white mb-1">AI Competitive Analysis</p>
            <p className="text-xs mb-4" style={{ color: '#7ba3c8' }}>
              Analyzes your competitors and generates specific tactics to outrank them
            </p>
            <button onClick={generate} disabled={!competitors.length}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
              style={{ background: '#e05a1c' }}>
              Generate AI Recommendations
            </button>
            {!competitors.length && (
              <p className="text-xs mt-2" style={{ color: '#3a5a7c' }}>Add competitors first to enable analysis</p>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 size={24} className="mx-auto mb-3 animate-spin" style={{ color: '#e05a1c' }} />
            <p className="text-sm text-white font-semibold">Analyzing competitive landscape…</p>
            <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>Identifying gaps and opportunities</p>
          </div>
        )}

        {recs && !loading && (
          <div className="space-y-4">
            {/* Summary */}
            <p className="text-sm leading-relaxed" style={{ color: '#c8d9eb' }}>{recs.summary}</p>

            {/* Callouts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border p-3" style={{ background: '#0a1020', borderColor: '#ef444430' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#ef4444' }}>⚠️ Biggest Gap</p>
                <p className="text-xs" style={{ color: '#c8d9eb' }}>{recs.biggest_gap}</p>
              </div>
              <div className="rounded-xl border p-3" style={{ background: '#0a1020', borderColor: '#10b98130' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#10b981' }}>⚡ Easiest Win</p>
                <p className="text-xs" style={{ color: '#c8d9eb' }}>{recs.easiest_win}</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              {recs.recommendations?.map((rec, i) => {
                const pc = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.medium;
                return (
                  <div key={i} className="rounded-xl border p-3.5 flex items-start gap-3"
                    style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0">
                      {getIcon(rec.title + ' ' + rec.description)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-white">{rec.title}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                          style={{ background: pc.bg, color: pc.color }}>{pc.label} Priority</span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: '#c8d9eb' }}>{rec.description}</p>
                      <p className="text-xs flex items-center gap-1" style={{ color: '#10b981' }}>
                        <ArrowUpRight size={10} /> {rec.impact}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}