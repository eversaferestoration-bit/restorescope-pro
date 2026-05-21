import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import {
  Star, Globe, MapPin, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Edit2, Trash2, CheckCircle, XCircle, Radio
} from 'lucide-react';

const FREQ_CONFIG = {
  daily:     { label: 'Daily',     color: '#10b981' },
  weekly:    { label: 'Weekly',    color: '#3b82f6' },
  biweekly:  { label: 'Bi-weekly', color: '#8b5cf6' },
  monthly:   { label: 'Monthly',   color: '#f59e0b' },
  rarely:    { label: 'Rarely',    color: '#ef4444' },
  unknown:   { label: 'Unknown',   color: '#3a5a7c' },
};

function ScoreBar({ value, max = 100, color = '#e05a1c' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1e2d45' }}>
        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold shrink-0" style={{ color }}>{value}</span>
    </div>
  );
}

export default function CompetitorCard({ competitor, myScore = 0 }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const freq = FREQ_CONFIG[competitor.estimated_post_frequency] || FREQ_CONFIG.unknown;
  const visGap = competitor.visibility_score - myScore;

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Competitor.update(competitor.id, { is_deleted: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitors'], exact: false });
      toast({ title: 'Competitor removed' });
    },
  });

  return (
    <div className="rounded-2xl border overflow-hidden transition hover:border-slate-600"
      style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold"
          style={{ background: '#1e2d45', color: '#e05a1c' }}>
          {competitor.competitor_name[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-bold text-white">{competitor.competitor_name}</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {competitor.city && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#7ba3c8' }}>
                    <MapPin size={10} /> {competitor.city}
                  </span>
                )}
                {competitor.website && (
                  <a href={competitor.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs hover:text-blue-400 transition" style={{ color: '#3a5a7c' }}>
                    <Globe size={10} /> Website
                  </a>
                )}
              </div>
            </div>
            {/* Visibility vs mine */}
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${visGap > 0 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
              {visGap > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {visGap > 0 ? `+${visGap} ahead` : `${Math.abs(visGap)} behind`}
            </div>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <p className="text-xs mb-1" style={{ color: '#3a5a7c' }}>Visibility</p>
              <ScoreBar value={competitor.visibility_score || 0} color="#e05a1c" />
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#3a5a7c' }}>Reviews</p>
              <div className="flex items-center gap-1.5">
                <Star size={11} style={{ color: '#f59e0b' }} />
                <span className="text-xs font-bold text-white">{competitor.google_rating?.toFixed(1) || '—'}</span>
                <span className="text-xs" style={{ color: '#3a5a7c' }}>({competitor.google_review_count || 0})</span>
              </div>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#3a5a7c' }}>Posting</p>
              <span className="text-xs font-semibold" style={{ color: freq.color }}>{freq.label}</span>
            </div>
          </div>

          {/* Services */}
          {competitor.service_categories?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {competitor.service_categories.slice(0, 4).map((s, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-lg"
                  style={{ background: '#1e2d45', color: '#c8d9eb' }}>{s}</span>
              ))}
              {competitor.service_categories.length > 4 && (
                <span className="text-xs" style={{ color: '#3a5a7c' }}>+{competitor.service_categories.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <button onClick={() => setExpanded(s => !s)}
        className="w-full flex items-center justify-center gap-1 py-2 border-t text-xs transition hover:bg-white/3"
        style={{ borderColor: '#1e2d45', color: '#3a5a7c' }}>
        {expanded ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> Strengths & Weaknesses</>}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: '#1e2d45' }}>
          {competitor.strengths?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#10b981' }}>Strengths</p>
              <ul className="space-y-1">
                {competitor.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#c8d9eb' }}>
                    <CheckCircle size={11} className="shrink-0 mt-0.5" style={{ color: '#10b981' }} /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {competitor.weaknesses?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#ef4444' }}>Weaknesses</p>
              <ul className="space-y-1">
                {competitor.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#c8d9eb' }}>
                    <XCircle size={11} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} /> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {competitor.notes && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#3a5a7c' }}>Notes</p>
              <p className="text-xs" style={{ color: '#7ba3c8' }}>{competitor.notes}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition"
              style={{ borderColor: '#ef444460', color: '#ef4444', background: '#ef444410' }}>
              <Trash2 size={11} /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}