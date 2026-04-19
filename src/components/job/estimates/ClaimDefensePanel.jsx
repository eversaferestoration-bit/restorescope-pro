import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, ShieldAlert, ShieldCheck, Loader2, AlertTriangle, CheckCircle2, FileWarning, Lightbulb, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const RISK_COLORS = {
  low:    { badge: 'bg-green-100 text-green-700 border-green-200',  icon: ShieldCheck, label: 'Low Risk' },
  medium: { badge: 'bg-amber-100 text-amber-700 border-amber-200',  icon: ShieldAlert, label: 'Medium Risk' },
  high:   { badge: 'bg-red-100 text-red-700 border-red-200',        icon: ShieldAlert, label: 'High Risk' },
};

function ScoreGauge({ score }) {
  const color = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  const trackColor = score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn('text-5xl font-bold font-display', color)}>{score}</div>
      <div className="text-xs text-muted-foreground">Defense Score</div>
      <div className="w-full bg-muted rounded-full h-2 mt-1">
        <div className={cn('h-2 rounded-full transition-all', trackColor)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, items, emptyMsg, itemClass }) {
  if (!items?.length) return (
    <div className="text-xs text-muted-foreground italic px-1">{emptyMsg}</div>
  );
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className={cn('flex items-start gap-2 rounded-lg px-3 py-2 text-sm', itemClass)}>
          <Icon size={13} className="mt-0.5 shrink-0" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function ClaimDefensePanel({ draft }) {
  const qc = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['claim-defense', draft.id],
    queryFn: () => base44.entities.ClaimDefense.filter({ estimate_version_id: draft.id }, '-created_at'),
  });

  const latest = analyses[0] || null;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      await base44.functions.invoke('analyzeClaimDefense', { estimate_version_id: draft.id });
      qc.invalidateQueries(['claim-defense', draft.id]);
    } catch (err) {
      setError(err?.response?.data?.error || 'Analysis failed. Please try again.');
    }
    setAnalyzing(false);
  };

  const riskCfg = latest ? (RISK_COLORS[latest.carrier_pushback_risk] || RISK_COLORS.medium) : null;
  const RiskIcon = riskCfg?.icon || Shield;

  return (
    <div className="p-4 space-y-4">
      {/* Header + run button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          <span className="text-sm font-semibold">Claim Defense Analysis</span>
          {latest && (
            <span className="text-xs text-muted-foreground">
              Last run {latest.created_at && !isNaN(new Date(latest.created_at)) ? format(new Date(latest.created_at), 'MMM d, h:mm a') : ''}
            </span>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-60"
        >
          {analyzing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {analyzing ? 'Analyzing…' : latest ? 'Re-Analyze' : 'Run Analysis'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-xs text-destructive">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {analyzing && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
          <Loader2 size={24} className="text-primary animate-spin" />
          <p className="text-sm font-medium">Analyzing estimate defensibility…</p>
          <p className="text-xs text-muted-foreground">Reviewing line items, documentation, photos, and scope evidence</p>
        </div>
      )}

      {!analyzing && isLoading && (
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
      )}

      {!analyzing && !isLoading && !latest && (
        <div className="bg-card rounded-xl border border-border p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Shield size={22} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold font-display">No analysis yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">Run a defense analysis to get an AI-powered assessment of this estimate's carrier pushback risk.</p>
          </div>
        </div>
      )}

      {!analyzing && latest && (
        <div className="space-y-4">
          {/* Score + risk row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <ScoreGauge score={latest.defense_score} />
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2">
              <RiskIcon size={28} className={riskCfg?.badge.split(' ')[1]} />
              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', riskCfg?.badge)}>
                {riskCfg?.label} Carrier Risk
              </span>
              <span className="text-xs text-muted-foreground text-center">Pushback probability</span>
            </div>
          </div>

          {/* Risk flags */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <AlertTriangle size={11} /> Risk Flags ({latest.risk_flags?.length || 0})
            </p>
            <Section
              icon={AlertTriangle}
              items={latest.risk_flags}
              emptyMsg="No risk flags identified."
              itemClass="bg-red-50 text-red-800 border border-red-100"
            />
          </div>

          {/* Missing documentation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileWarning size={11} /> Missing Documentation ({latest.missing_documentation?.length || 0})
            </p>
            <Section
              icon={FileWarning}
              items={latest.missing_documentation}
              emptyMsg="No documentation gaps found."
              itemClass="bg-amber-50 text-amber-800 border border-amber-100"
            />
          </div>

          {/* Recommended actions */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb size={11} /> Recommended Actions ({latest.recommended_actions?.length || 0})
            </p>
            <Section
              icon={CheckCircle2}
              items={latest.recommended_actions}
              emptyMsg="No actions needed."
              itemClass="bg-green-50 text-green-800 border border-green-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}