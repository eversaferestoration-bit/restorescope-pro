import { useState } from 'react';
import UpgradePrompt from '@/components/UpgradePrompt';
import { base44 } from '@/api/base44Client';
import { Sparkles, AlertTriangle, CheckCircle2, Loader2, RotateCcw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_LABELS = {
  low: { range: [0, 0.3], label: 'Minor', color: 'text-green-600', bg: 'bg-green-100' },
  moderate: { range: [0.3, 0.6], label: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-100' },
  major: { range: [0.6, 0.85], label: 'Major', color: 'text-orange-600', bg: 'bg-orange-100' },
  critical: { range: [0.85, 1.01], label: 'Critical', color: 'text-red-600', bg: 'bg-red-100' },
};

function severityLevel(score) {
  return Object.values(SEVERITY_LABELS).find(({ range }) => score >= range[0] && score < range[1]) || SEVERITY_LABELS.low;
}

function ConfidenceBar({ score }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'bg-green-500' : score >= 0.65 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{pct}%</span>
    </div>
  );
}

function SeverityBar({ score }) {
  const pct = Math.round(score * 100);
  const level = severityLevel(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', level.bg.replace('bg-', 'bg-').replace('100', '500'))} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', level.bg, level.color)}>{level.label}</span>
    </div>
  );
}

export default function PhotoAnalysisPanel({ photo, jobId }) {
  const [analysis, setAnalysis] = useState(
    // Pre-populate from entity fields if already analyzed
    photo.analysis_status === 'analysis_complete' && photo.damage_tags?.length
      ? {
          damage_type: photo.damage_tags?.[0] || null,
          material_type: photo.material_tags?.[0] || null,
          surface: photo.material_tags?.[1] || null,
          severity_score: photo.severity_score,
          confidence_score: photo.confidence_score,
          manual_review_required: photo.manual_review_required,
          next_step: null,
          scope_suggestions: [],
          _partial: true, // loaded from entity, no next_step/scope
        }
      : null
  );
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setExpanded(true);
    const res = await base44.functions.invoke('analyzePhoto', {
      photo_id: photo.id,
      file_url: photo.file_url,
      job_id: jobId,
    });
    setAnalysis(res.data.analysis);
    setLoading(false);
  };

  const needsReview = analysis?.manual_review_required;
  const isAnalyzed = !!analysis && !analysis._partial;
  const hasPartial = analysis?._partial;

  return (
    <div className="mt-3 border border-border rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => isAnalyzed || hasPartial ? setExpanded(!expanded) : analyze()}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition',
          (isAnalyzed || hasPartial) ? 'hover:bg-muted/40' : 'hover:bg-accent/20',
          needsReview ? 'bg-amber-50' : isAnalyzed ? 'bg-green-50/50' : 'bg-muted/20'
        )}
      >
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 size={15} className="text-primary animate-spin" />
          ) : needsReview ? (
            <AlertTriangle size={15} className="text-amber-500" />
          ) : isAnalyzed ? (
            <CheckCircle2 size={15} className="text-green-500" />
          ) : hasPartial ? (
            <Info size={15} className="text-muted-foreground" />
          ) : (
            <Sparkles size={15} className="text-primary" />
          )}
          <span className="text-xs font-semibold">
            {loading ? 'Analyzing…' :
             needsReview ? 'Review Required' :
             isAnalyzed ? `AI: ${(analysis.damage_type || 'unknown').replace(/_/g, ' ')}` :
             hasPartial ? `Analyzed: ${(analysis.damage_type || 'unknown').replace(/_/g, ' ')}` :
             'Run AI Analysis'}
          </span>
          {(isAnalyzed || hasPartial) && analysis.severity_score != null && (
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', severityLevel(analysis.severity_score).bg, severityLevel(analysis.severity_score).color)}>
              {severityLevel(analysis.severity_score).label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(isAnalyzed || hasPartial) && (
            <button
              onClick={(e) => { e.stopPropagation(); analyze(); }}
              className="text-muted-foreground hover:text-primary transition"
              title="Re-analyze"
            >
              <RotateCcw size={12} />
            </button>
          )}
          {(isAnalyzed || hasPartial) && (
            expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && analysis && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border">

          {needsReview && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">Manual review required before using this assessment in estimates.</p>
            </div>
          )}

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Severity</p>
              <SeverityBar score={analysis.severity_score ?? 0} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Confidence</p>
              <ConfidenceBar score={analysis.confidence_score ?? 0} />
            </div>
          </div>

          {/* Tags */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Damage', value: analysis.damage_type },
              { label: 'Material', value: analysis.material_type },
              { label: 'Surface', value: analysis.surface },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/40 rounded-lg px-2 py-1.5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xs font-medium mt-0.5 capitalize">{(value || '—').replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>

          {/* Next step */}
          {analysis.next_step && (
            <div className="bg-accent/40 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">Next Step</p>
              <p className="text-xs font-medium">{analysis.next_step}</p>
            </div>
          )}

          {/* Scope suggestions */}
          {analysis.scope_suggestions?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <p className="text-xs text-muted-foreground font-medium">Scope Suggestions</p>
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">AI only — not final</span>
              </div>
              <ul className="space-y-1">
                {analysis.scope_suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <span className="text-primary mt-0.5">·</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}