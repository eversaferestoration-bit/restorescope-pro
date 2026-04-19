import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function DominanceValidation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [validating, setValidating] = useState(false);

  const { data: latestReport } = useQuery({
    queryKey: ['dominance-report'],
    queryFn: () =>
      base44.entities.ValidationReport.filter(
        { validation_type: 'full_dominance', is_deleted: false },
        '-timestamp',
        1
      ).then((r) => r[0]),
    enabled: !!user,
  });

  const runValidationMutation = useMutation({
    mutationFn: () => base44.functions.invoke('runDominanceValidation', {}),
    onSuccess: () => {
      qc.invalidateQueries(['dominance-report']);
      setValidating(false);
    },
  });

  const handleRunValidation = async () => {
    setValidating(true);
    await runValidationMutation.mutateAsync();
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-semibold">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Shield size={24} className="text-primary" />
          Dominance Validation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comprehensive system validation & readiness certification
        </p>
      </div>

      {/* Run Button */}
      <Button
        onClick={handleRunValidation}
        disabled={validating || runValidationMutation.isPending}
        size="lg"
        className="w-full md:w-auto"
      >
        {validating || runValidationMutation.isPending ? (
          <>
            <Loader2 size={16} className="animate-spin mr-2" />
            Running Validation...
          </>
        ) : (
          <>
            <Zap size={16} className="mr-2" />
            Run Full Dominance Validation
          </>
        )}
      </Button>

      {/* Latest Report */}
      {latestReport ? (
        <div className="space-y-4">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-2xl font-bold">{latestReport.status}</p>
                  </div>
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      latestReport.status === 'passed'
                        ? 'bg-green-100'
                        : latestReport.status === 'critical'
                        ? 'bg-red-100'
                        : 'bg-amber-100'
                    )}
                  >
                    {latestReport.status === 'passed' ? (
                      <CheckCircle2 size={18} className="text-green-600" />
                    ) : (
                      <AlertTriangle size={18} className="text-amber-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tests</p>
                  <p className="text-2xl font-bold">
                    {latestReport.passed_tests}/{latestReport.total_tests}
                  </p>
                  <p className="text-xs text-green-600 font-medium">Passed</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Issues</p>
                  <p className="text-2xl font-bold">{latestReport.issues.length}</p>
                  <p className="text-xs text-red-600 font-medium">
                    {latestReport.issues.filter((i) => i.severity === 'critical').length} Critical
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                latestReport.is_dominance_ready
                  ? 'border-green-200 bg-green-50'
                  : 'border-amber-200 bg-amber-50'
              )}
            >
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Certification</p>
                  <p className="text-lg font-bold">
                    {latestReport.is_dominance_ready ? '✓ Ready' : '✗ Not Ready'}
                  </p>
                  <p className="text-xs font-medium">
                    {latestReport.is_dominance_ready ? 'text-green-600' : 'text-amber-600'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Integrity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Data Integrity Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm">Orphaned Records</p>
                <Badge
                  variant={
                    latestReport.data_integrity_checks.orphaned_records === 0
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {latestReport.data_integrity_checks.orphaned_records}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Invalid Calculations</p>
                <Badge
                  variant={
                    latestReport.data_integrity_checks.invalid_calculations === 0
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {latestReport.data_integrity_checks.invalid_calculations}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Anonymization Violations</p>
                <Badge
                  variant={
                    latestReport.data_integrity_checks.anonymization_violations === 0
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {latestReport.data_integrity_checks.anonymization_violations}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Security Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield size={16} /> Security Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                ['Auth Verified', latestReport.security_checklist.auth_verified],
                ['RLS Enforced', latestReport.security_checklist.rls_enforced],
                ['PII Protected', latestReport.security_checklist.pii_protected],
                ['Audit Logging', latestReport.security_checklist.audit_logging_enabled],
                ['Encryption', latestReport.security_checklist.encryption_validated],
              ].map(([name, passed]) => (
                <div key={name} className="flex items-center justify-between">
                  <p className="text-sm">{name}</p>
                  {passed ? (
                    <CheckCircle2 size={16} className="text-green-600" />
                  ) : (
                    <AlertCircle size={16} className="text-destructive" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Performance */}
          {latestReport.performance_metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp size={16} /> Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Avg Response Time</p>
                  <p className="font-semibold">
                    {latestReport.performance_metrics.avg_response_time_ms}ms
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">P95 Latency</p>
                  <p className="font-semibold">
                    {latestReport.performance_metrics.p95_response_time_ms}ms
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">Error Rate</p>
                  <p className="font-semibold">
                    {latestReport.performance_metrics.error_rate_percent}%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Issues */}
          {latestReport.issues.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600" />
                  Issues Found ({latestReport.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestReport.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'border rounded-lg p-3',
                      issue.severity === 'critical'
                        ? 'border-red-200 bg-red-50'
                        : issue.severity === 'high'
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-blue-200 bg-blue-50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-sm capitalize">{issue.category}</p>
                      <Badge
                        className={
                          issue.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : issue.severity === 'high'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{issue.description}</p>
                    {issue.remediation && (
                      <p className="text-xs font-medium text-muted-foreground">
                        Fix: {issue.remediation}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Certification */}
          <Card
            className={cn(
              'border-2',
              latestReport.is_dominance_ready
                ? 'border-green-200 bg-green-50'
                : 'border-amber-200 bg-amber-50'
            )}
          >
            <CardContent className="p-6 text-center">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3',
                  latestReport.is_dominance_ready ? 'bg-green-100' : 'bg-amber-100'
                )}
              >
                {latestReport.is_dominance_ready ? (
                  <CheckCircle2 size={24} className="text-green-600" />
                ) : (
                  <AlertTriangle size={24} className="text-amber-600" />
                )}
              </div>
              <p className="font-semibold text-lg mb-2">
                {latestReport.is_dominance_ready ? 'System Dominance-Ready' : 'Remediation Required'}
              </p>
              <p className="text-sm text-muted-foreground">{latestReport.certification_notes}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No validation report yet. Run validation to start.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}