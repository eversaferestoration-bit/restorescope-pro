import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import UpgradeNudge from '@/components/trial/UpgradeNudge';
import { useUpgradeTrigger } from '@/hooks/useUpgradeTrigger';
import { Shield, RefreshCw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import DefenseScoreRing from '@/components/job/defense/DefenseScoreRing';
import RiskFlagList from '@/components/job/defense/RiskFlagList';
import MissingDocList from '@/components/job/defense/MissingDocList';
import RecommendedActions from '@/components/job/defense/RecommendedActions';

function Section({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {count != null && (
            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-medium">{count}</span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function JobDefense({ job, estimateId }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isTechnician = user?.role === 'technician';
  const nudge = useUpgradeTrigger({ feature: 'advanced' });

  // Load all defenses for this estimate, most recent first
  const { data: defenses = [], isLoading } = useQuery({
    queryKey: ['defense', estimateId],
    queryFn: () => base44.entities.ClaimDefense.filter({ estimate_version_id: estimateId, is_deleted: false }, '-created_at'),
    enabled: !!estimateId,
  });

  const latest = defenses[0] || null;
  const [selectedId, setSelectedId] = useState(null);
  const active = defenses.find(d => d.id === selectedId) || latest;

  const analyzeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('analyzeClaimDefense', { estimate_version_id: estimateId }),
    onSuccess: () => {
      qc.invalidateQueries(['defense', estimateId]);
      setSelectedId(null); // auto-select newest
    },
  });

  if (!estimateId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Shield size={32} className="text-muted-foreground" />
        <p className="text-sm font-semibold">No estimate selected</p>
        <p className="text-xs text-muted-foreground">Select an estimate version to run a defense analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Upgrade nudge for advanced feature */}
      {nudge && <UpgradeNudge {...nudge} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold font-display flex items-center gap-2">
            <Shield size={15} className="text-primary" /> Claim Defense Analysis
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">AI-powered review of estimate defensibility against carrier pushback</p>
        </div>
        {!isTechnician && (
          <button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            <RefreshCw size={14} className={analyzeMutation.isPending ? 'animate-spin' : ''} />
            {analyzeMutation.isPending ? 'Analyzing…' : latest ? 'Re-analyze' : 'Run Analysis'}
          </button>
        )}
      </div>

      {analyzeMutation.isPending && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center gap-3">
          <RefreshCw size={18} className="text-primary animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-primary">Analyzing claim defensibility…</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reviewing estimate, photos, scope, readings, and observations.</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : !active ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Shield size={22} className="text-muted-foreground" />
          </div>
          <p className="font-semibold font-display">No analysis yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Run a defense analysis to identify risks, missing documentation, and get actionable recommendations before submitting to the carrier.
          </p>
        </div>
      ) : (
        <>
          {/* History selector */}
          {defenses.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Clock size={13} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Previous analyses:</span>
              {defenses.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border transition',
                    active.id === d.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-border'
                  )}
                >
                  #{defenses.length - i} · Score {d.defense_score}
                  {i === 0 && ' (latest)'}
                </button>
              ))}
            </div>
          )}

          {/* Score + summary */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex gap-6 items-center flex-wrap">
              <DefenseScoreRing score={active.defense_score} pushbackRisk={active.carrier_pushback_risk} />
              <div className="flex-1 min-w-0">
                {active.analysis_summary && (
                  <p className="text-sm text-foreground/90 leading-relaxed">{active.analysis_summary}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Clock size={11} />
                  {active.created_at && !isNaN(new Date(active.created_at))
                    ? `Analyzed ${format(new Date(active.created_at), 'MMM d, yyyy h:mm a')}`
                    : 'Analysis complete'}
                </p>
              </div>
            </div>
          </div>

          {/* Risk flags */}
          <Section title="Risk Flags" count={active.risk_flags?.length || 0}>
            <RiskFlagList flags={active.risk_flags} />
          </Section>

          {/* Missing documentation */}
          <Section title="Missing Documentation" count={active.missing_documentation?.length || 0}>
            <MissingDocList items={active.missing_documentation} />
          </Section>

          {/* Recommended actions */}
          <Section title="Recommended Actions" count={active.recommended_actions?.length || 0} defaultOpen={true}>
            <RecommendedActions actions={active.recommended_actions} />
          </Section>

          <p className="text-xs text-muted-foreground text-center pb-2">
            This analysis is advisory only — no estimate data has been modified.
          </p>
        </>
      )}
    </div>
  );
}