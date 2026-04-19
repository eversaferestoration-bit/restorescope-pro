import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, CheckCircle, AlertCircle, DollarSign, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function MetricBox({ icon: Icon, label, value, subtext, color }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
        <Icon size={14} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

export default function OutcomePanel({ jobId }) {
  const [showDetails, setShowDetails] = useState(false);

  const { data: winRate, isLoading, error } = useQuery({
    queryKey: ['win-rate', jobId],
    queryFn: () => base44.functions.invoke('calculateWinRate', { job_id: jobId }),
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

  if (error || !winRate?.data) {
    return (
      <div className="rounded-xl border border-border p-4">
        <p className="text-sm text-muted-foreground">No outcome data available</p>
      </div>
    );
  }

  const {
    approval_percentage,
    supplement_success_rate,
    total_requested,
    total_approved,
    total_recovered,
    recovery_ratio,
    supplement_count,
    supplements_approved,
    supplement_amount,
    outcomes,
  } = winRate.data;

  // Determine status color
  let statusColor = 'bg-green-100 text-green-700';
  let statusLabel = 'Favorable';
  if (recovery_ratio < 60) {
    statusColor = 'bg-red-100 text-red-700';
    statusLabel = 'Unfavorable';
  } else if (recovery_ratio < 80) {
    statusColor = 'bg-amber-100 text-amber-700';
    statusLabel = 'Moderate';
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Award size={14} className="text-primary" />
          Claim Outcome
        </h3>
        <Badge className={statusColor}>{statusLabel}</Badge>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricBox
          icon={TrendingUp}
          label="Recovery Ratio"
          value={`${recovery_ratio}%`}
          subtext={`$${total_recovered.toLocaleString()} / $${total_requested.toLocaleString()}`}
          color="bg-blue-600"
        />
        <MetricBox
          icon={CheckCircle}
          label="Approval Rate"
          value={`${approval_percentage}%`}
          subtext={`$${total_approved.toLocaleString()} approved`}
          color="bg-green-600"
        />
        <MetricBox
          icon={DollarSign}
          label="Initial Approved"
          value={`$${total_approved.toLocaleString()}`}
          subtext={`of $${total_requested.toLocaleString()}`}
          color="bg-purple-600"
        />
        <MetricBox
          icon={AlertCircle}
          label="Supplement Success"
          value={`${supplement_success_rate}%`}
          subtext={`${supplements_approved} of ${supplement_count} approved`}
          color="bg-amber-600"
        />
      </div>

      {/* Supplement details */}
      {supplement_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-900">Supplement Activity</p>
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
            <div>
              <p className="text-amber-700 font-medium">{supplement_count}</p>
              <p className="text-amber-600">filed</p>
            </div>
            <div>
              <p className="text-amber-700 font-medium">{supplements_approved}</p>
              <p className="text-amber-600">approved</p>
            </div>
            <div>
              <p className="text-amber-700 font-medium">+${supplement_amount.toLocaleString()}</p>
              <p className="text-amber-600">recovered</p>
            </div>
          </div>
        </div>
      )}

      {/* Expandable details */}
      {outcomes.length > 0 && (
        <>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-primary font-medium hover:underline"
          >
            {showDetails ? 'Hide' : 'Show'} estimate details
          </button>

          {showDetails && (
            <div className="space-y-2">
              {outcomes.map((outcome, idx) => (
                <Card key={outcome.id} className="border-border">
                  <CardContent className="p-3 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Estimate {idx + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {outcome.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-muted-foreground">Requested</p>
                        <p className="font-semibold">${outcome.requested_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Approved</p>
                        <p className="font-semibold">${outcome.approved_amount.toLocaleString()}</p>
                      </div>
                      {outcome.supplement_amount > 0 && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Supplement</p>
                          <p className="font-semibold text-green-600">+${outcome.supplement_amount.toLocaleString()}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Final Amount</p>
                        <p className="font-semibold">${outcome.final_amount.toLocaleString()}</p>
                      </div>
                    </div>
                    {outcome.win_rate_percent !== undefined && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-muted-foreground">Win Rate</p>
                        <p className="font-semibold">{outcome.win_rate_percent}%</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}