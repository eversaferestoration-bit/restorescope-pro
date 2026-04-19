import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Activity, CheckCircle, AlertTriangle, TrendingUp, Database, Users, Zap, Shield, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_COLORS = {
  pass: 'bg-green-100 text-green-700 border-green-300',
  fail: 'bg-red-100 text-red-700 border-red-300',
  skipped: 'bg-yellow-100 text-yellow-700 border-yellow-300',
};

function TestResultCard({ name, result }) {
  const statusConfig = {
    pass: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    fail: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    skipped: { icon: Activity, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  };

  const config = statusConfig[result.passed ? (result.skipped ? 'skipped' : 'pass') : 'fail'];
  const Icon = config.icon;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{name}</CardTitle>
          <Badge className={STATUS_COLORS[result.passed ? (result.skipped ? 'skipped' : 'pass') : 'fail']}>
            <Icon size={10} className="inline mr-1" />
            {result.skipped ? 'Skipped' : result.passed ? 'Pass' : 'Fail'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {result.error && (
          <p className="text-xs text-destructive mb-2">{result.error}</p>
        )}
        {result.warning && (
          <p className="text-xs text-amber-600 mb-2">{result.warning}</p>
        )}
        {result.metrics && Object.keys(result.metrics).length > 0 && (
          <div className="space-y-1">
            {Object.entries(result.metrics).slice(0, 4).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-medium">{typeof value === 'number' ? value.toLocaleString() : String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SystemStatusDashboard() {
  const { user } = useAuth();
  const [lastValidation, setLastValidation] = useState(null);

  const { data: validation, isLoading, refetch } = useQuery({
    queryKey: ['enterprise-validation'],
    queryFn: () => base44.functions.invoke('validateEnterpriseScale', {}),
    enabled: user?.role === 'admin',
  });

  const { data: performance } = useQuery({
    queryKey: ['performance-analysis'],
    queryFn: () => base44.functions.invoke('optimizePerformance', {}),
    enabled: user?.role === 'admin',
  });

  if (user?.role !== 'admin') {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="p-6 text-center">
          <Shield size={48} className="mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground">System status dashboard is only available to administrators.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Activity size={24} className="text-primary" />
            Enterprise System Status
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time validation and performance monitoring</p>
        </div>
        <Button onClick={() => refetch()} disabled={isLoading} className="gap-2">
          <TrendingUp size={14} />
          {isLoading ? 'Running...' : 'Run Validation'}
        </Button>
      </div>

      {/* Overall Status */}
      {validation && (
        <Card className={validation.overall_status === 'pass' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {validation.overall_status === 'pass' ? (
                  <CheckCircle size={32} className="text-green-600" />
                ) : (
                  <AlertTriangle size={32} className="text-red-600" />
                )}
                <div>
                  <p className="text-sm font-semibold">
                    System Status: {validation.overall_status === 'pass' ? '✅ Enterprise-Ready' : '❌ Issues Detected'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last validation: {new Date(validation.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{Object.keys(validation.tests).length}/7</p>
                <p className="text-xs text-muted-foreground">Tests Passed</p>
              </div>
            </div>
            {validation.issues?.length > 0 && (
              <div className="mt-4 space-y-2">
                {validation.issues.map((issue, idx) => (
                  <div key={idx} className="text-xs text-red-700 bg-red-100 px-3 py-2 rounded">
                    <strong>{issue.test}:</strong> {issue.issue}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Score */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                Performance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{performance.performance_score}/100</p>
              <p className="text-xs text-muted-foreground mt-1">
                {performance.performance_score >= 90 ? 'Excellent' : performance.performance_score >= 70 ? 'Good' : 'Needs Improvement'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Database size={14} className="text-blue-600" />
                Total Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{performance.metrics.total_records.total.toLocaleString()}</p>
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <div>Jobs: {performance.metrics.total_records.jobs}</div>
                <div>Estimates: {performance.metrics.total_records.estimates}</div>
                <div>Photos: {performance.metrics.total_records.photos}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users size={14} className="text-purple-600" />
                Enterprise Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Multi-Location</span>
                  <span className="font-medium">✅</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audit Logging</span>
                  <span className="font-medium">✅</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adjuster Intelligence</span>
                  <span className="font-medium">✅</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Results Grid */}
      {validation && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Validation Test Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(validation.tests).map(([name, result]) => (
              <TestResultCard key={name} name={name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} result={result} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {performance?.recommendations?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 size={14} />
            Optimization Recommendations
          </h2>
          <div className="space-y-2">
            {performance.recommendations.map((rec, idx) => (
              <Card key={idx} className={rec.priority === 'high' ? 'border-red-300 bg-red-50' : 'border-border'}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'outline'}>
                          {rec.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">{rec.category}</span>
                      </div>
                      <p className="text-sm font-medium">{rec.recommendation}</p>
                      <p className="text-xs text-muted-foreground mt-1">Impact: {rec.impact}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Running enterprise validation tests…</p>
        </div>
      )}
    </div>
  );
}