import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Sparkles, Loader2, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, FileText, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = {
  containment: 'bg-purple-100 text-purple-700 border-purple-200',
  demolition: 'bg-red-100 text-red-700 border-red-200',
  drying: 'bg-blue-100 text-blue-700 border-blue-200',
  cleaning: 'bg-green-100 text-green-700 border-green-200',
  deodorization: 'bg-amber-100 text-amber-700 border-amber-200',
  hepa: 'bg-teal-100 text-teal-700 border-teal-200',
  contents: 'bg-orange-100 text-orange-700 border-orange-200',
  documentation: 'bg-slate-100 text-slate-700 border-slate-200',
};

function EvidenceSummary({ summary }) {
  return (
    <div className="flex flex-wrap gap-3">
      {[
        { label: 'Observations', value: summary.observations },
        { label: 'Moisture Readings', value: summary.moisture },
        { label: 'Env Readings', value: summary.env },
        { label: 'Photos', value: summary.photos },
        { label: 'Scope Items', value: summary.scope_items },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold">{value}</span>
        </div>
      ))}
    </div>
  );
}

function JustificationCard({ item }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const colorClass = CATEGORY_COLORS[item.category] || 'bg-muted text-muted-foreground border-border';

  const handleCopy = () => {
    navigator.clipboard.writeText(item.note);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition"
      >
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border capitalize', colorClass)}>
            {item.category}
          </span>
          <span className="text-xs text-muted-foreground">{item.evidence_refs?.length || 0} evidence refs</span>
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-relaxed flex-1">{item.note}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition text-muted-foreground"
              title="Copy note"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            </button>
          </div>

          {item.evidence_refs?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Evidence cited</p>
              <ul className="space-y-1">
                {item.evidence_refs.map((ref, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 size={11} className="text-green-500 mt-0.5 shrink-0" />
                    {ref}
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

export default function JobJustification({ job }) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const isTechnician = user?.role === 'technician';

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('generateJustification', { job_id: job.id });
      setResult(res.data);
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.message || 'Failed to generate justification. Please try again.');
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      {/* Header / Generate */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold font-display">Scope Justification</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-generated carrier-facing notes grounded in job evidence
          </p>
        </div>
        {!isTechnician && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60 shrink-0"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generating ? 'Generating…' : result ? 'Regenerate' : 'Generate Justification'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {generating && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {!generating && result && (
        <div className="space-y-4">
          {/* Evidence summary bar */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Evidence used</p>
            <EvidenceSummary summary={result.evidence_summary} />
          </div>

          {/* Per-category justifications */}
          <div className="space-y-3">
            {result.justifications?.map((item) => (
              <JustificationCard key={item.category} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!generating && !result && !error && (
        <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center justify-center text-center gap-3 min-h-[220px]">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
            <FileText size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold font-display">No justification generated yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Confirm your scope items first, then click Generate to create carrier-ready justification notes for each category.
            </p>
          </div>
          {!isTechnician && (
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
            >
              <Sparkles size={14} /> Generate Justification
            </button>
          )}
        </div>
      )}
    </div>
  );
}