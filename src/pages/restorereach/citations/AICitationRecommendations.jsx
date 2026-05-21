import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { Sparkles, Loader2, ArrowUpRight, RefreshCw } from 'lucide-react';

const PRIORITY_CONFIG = {
  high:   { color: '#ef4444', bg: '#ef444420' },
  medium: { color: '#f59e0b', bg: '#f59e0b20' },
  low:    { color: '#10b981', bg: '#10b98120' },
};

function getEmoji(title = '') {
  const t = title.toLowerCase();
  if (t.includes('post')) return '📝';
  if (t.includes('review')) return '⭐';
  if (t.includes('photo')) return '📸';
  if (t.includes('page') || t.includes('local')) return '📄';
  if (t.includes('city') || t.includes('area')) return '📍';
  if (t.includes('nap') || t.includes('consistent') || t.includes('mismatch')) return '🔄';
  if (t.includes('missing') || t.includes('directory') || t.includes('listing')) return '🗂️';
  return '⚡';
}

export default function AICitationRecommendations({ citations, masterNAP, citationScore }) {
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState(null);

  const generate = async () => {
    setLoading(true);
    try {
      const consistent = citations.filter(c => c.status === 'consistent').length;
      const inconsistent = citations.filter(c => c.status === 'inconsistent').length;
      const missing = citations.filter(c => c.status === 'missing').length;
      const unchecked = citations.filter(c => c.status === 'unchecked').length;
      const missingDirs = citations.filter(c => c.status === 'missing').map(c => c.directory_name).join(', ') || 'none';
      const inconsistentDirs = citations.filter(c => c.status === 'inconsistent').map(c => c.directory_name).join(', ') || 'none';

      const prompt = `You are a local SEO expert for a restoration company.

Citation audit summary:
- Overall citation score: ${citationScore}/100
- Total citations tracked: ${citations.length}
- Consistent: ${consistent}
- Inconsistent: ${inconsistent} (directories: ${inconsistentDirs})
- Missing listings: ${missing} (directories: ${missingDirs})
- Unchecked: ${unchecked}
- Master NAP: ${masterNAP?.business_name || 'Not set'}, ${masterNAP?.address || 'no address'}, ${masterNAP?.phone || 'no phone'}

Provide exactly 6 specific, prioritized recommendations to improve this company's local SEO citation profile.
Cover: fixing NAP mismatches, adding missing listings, improving GBP posting frequency, adding more photos, building local pages, increasing review count.

Return ONLY valid JSON:
{
  "summary": "2-sentence overall citation health assessment",
  "recommendations": [
    { "title": "Short title", "description": "Specific actionable step (1-2 sentences)", "priority": "high|medium|low", "impact": "Expected outcome" }
  ],
  "critical_fix": "The single most urgent action to take right now",
  "quick_win": "The fastest improvement available"
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
            critical_fix: { type: 'string' },
            quick_win: { type: 'string' },
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

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: '#e05a1c' }} />
          <span className="text-sm font-semibold text-white">AI Citation Recommendations</span>
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
            <Sparkles size={26} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
            <p className="text-sm font-semibold text-white mb-1">Fix Your Local SEO</p>
            <p className="text-xs mb-4" style={{ color: '#7ba3c8' }}>
              AI analyzes your citation gaps and generates a prioritized fix plan
            </p>
            <button onClick={generate}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
              style={{ background: '#e05a1c' }}>
              Generate Recommendations
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 size={24} className="mx-auto mb-3 animate-spin" style={{ color: '#e05a1c' }} />
            <p className="text-sm text-white font-semibold">Analyzing citation health…</p>
          </div>
        )}

        {recs && !loading && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: '#c8d9eb' }}>{recs.summary}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border p-3" style={{ background: '#0a1020', borderColor: '#ef444430' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#ef4444' }}>🚨 Critical Fix</p>
                <p className="text-xs" style={{ color: '#c8d9eb' }}>{recs.critical_fix}</p>
              </div>
              <div className="rounded-xl border p-3" style={{ background: '#0a1020', borderColor: '#10b98130' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#10b981' }}>⚡ Quick Win</p>
                <p className="text-xs" style={{ color: '#c8d9eb' }}>{recs.quick_win}</p>
              </div>
            </div>

            <div className="space-y-2">
              {recs.recommendations?.map((rec, i) => {
                const pc = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.medium;
                return (
                  <div key={i} className="rounded-xl border p-3.5 flex items-start gap-3"
                    style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
                    <span className="text-base shrink-0">{getEmoji(rec.title)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-white">{rec.title}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: pc.bg, color: pc.color }}>
                          {rec.priority?.charAt(0).toUpperCase() + rec.priority?.slice(1)}
                        </span>
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