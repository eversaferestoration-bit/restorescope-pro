import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Database,
  Users,
  Zap,
  Shield,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_COLORS = {
  pass: 'bg-green-100 text-green-700 border-green-300',
  fail: 'bg-red-100 text-red-700 border-red-300',
  skipped: 'bg-yellow-100 text-yellow-700 border-yellow-300',
};

const emptyValidation = {
  overall_status: 'skipped',
  timestamp: new Date().toISOString(),
  tests: {},
  issues: [],
};

const emptyPerformance = {
  performance_score: 0,
  metrics: {
    total_records: {
      total: 0,
      jobs: 0,
      estimates: 0,
      photos: 0,
    },
  },
  recommendations: [],
};

function unwrapFunctionResponse(response, fallback) {
  if (!response) return fallback;
  if (response.data) return response.data;
  return response;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function TestResultCard({ name, result }) {
  const cleanResult = result || {};
  const passed = !!cleanResult.passed;
  const skipped = !!cleanResult.skipped;

  const statusConfig = {
    pass: { icon: CheckCircle, color: 'text-green-600' },
    fail: { icon: AlertTriangle, color: 'text-red-600' },
    skipped: { icon: Activity, color: 'text-yellow-600' },
  };

  const status = passed ? (skipped ? 'skipped' : 'pass') : 'fail';
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">{name}</CardTitle>
          <Badge className={STATUS_COLORS[status]}>
            <Icon size={10} className="inline mr-1" />
            {skipped ? 'Skipped' : passed ? 'Pass' : 'Fail'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {cleanResult.error && <p className="text-xs text-destructive mb-2">{cleanResult.error}</p>}

        {cleanResult.warning && <p className="text-xs text-amber-600 mb-2">{cleanResult.warning}</p>}

        {cleanResult.metrics && Object.keys(cleanResult.metrics).length > 0 && (
          <div className="space-y-1">
            {Object.entries(cleanResult.metrics)
              .slice(0, 4)
              .map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-medium">
                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                  </span>
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

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'platform_admin';

  const validationQuery = useQuery({
    queryKey: ['enterprise-validation'],
    enabled: isAdmin,
    retry: false,
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('validateEnterpriseScale', {});
        return unwrapFunctionResponse(response, emptyValidation);
      } catch (error) {
        return {
          ...emptyValidation,
          issues: [
            {
              test: 'validateEnterpriseScale',
              issue: error?.message || 'Validation function unavailable.',
            },
          ],
        };
      }
    },
  });

  const performanceQuery = useQuery({
    queryKey: ['performance-analysis'],
    enabled: isAdmin,
    retry: false,
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('optimizePerformance', {});
        return unwrapFunctionResponse(response, emptyPerformance);
      } catch {
        try {
          const response = await base44.functions.invoke('getUsageReport', {});
          const report = unwrapFunctionResponse(response, emptyPerformance);

          return {
            performance_score: 0,
            metrics: report?.metrics || emptyPerformance.metrics,
            recommendations: [],
          };
        } catch (error) {
          return {
            ...emptyPerformance,
            recommendations: [
              {
                priority: 'medium',
                category: 'analytics',
                recommendation: 'Performance analytics are not available yet.',
                impact: error?.message || 'Fallback data loaded.',
              },
            ],
          };
        }
      }
    },
  });

  const validation = validationQuery.data || emptyValidation;
  const performance = performanceQuery.data || emptyPerformance;

  const totalRecords = useMemo(() => {
    const records = performance?.metrics?.total_records || {};
    return {
      total: safeNumber(records.total),
      jobs: safeNumber(records.jobs),
      estimates: safeNumber(records.estimates),
      photos: safeNumber(records.photos),
    };
  }, [performance]);

  const recommendations = Array.isArray(performance?.recommendations) ? performance.recommendations : [];
  const tests = validation?.tests && typeof validation.tests === 'object' ? validation.tests : {};
  const issues = Array.isArray(validation?.issues) ? validation.issues : [];
  const testCount = Object.keys(tests).length;
  const passedCount = Object.values(tests).filter((test) => test?.passed).length;
  const validationStatus = validation?.overall_status || 'skipped';

  const runAll = () => {
    validationQuery.refetch();
    performanceQuery.refetch();
  };

  if (!isAdmin) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="p-6 text-center">
          <Shield size={48} className="mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground">
            System status dashboard is only available to administrators.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Activity size={24} className="text-primary" />
            Enterprise System Status
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Validation and performance monitoring for beta readiness.
          </p>
        </div>

        <Button
          onClick={runAll}
          disabled={validationQuery.isLoading || performanceQuery.isLoading}
          className="gap-2"
        >
          <TrendingUp size={14} />
          {validationQuery.isLoading || performanceQuery.isLoading ? 'Running...' : 'Run Validation'}
        </Button>
      </div>

      <Card
        className={
          validationStatus === 'pass'
            ? 'border-green-300 bg-green-50'
            : issues.length > 0
              ? 'border-red-300 bg-red-50'
              : 'border-yellow-300 bg-yellow-50'
        }
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {validationStatus === 'pass' ? (
                <CheckCircle size={32} className="text-green-600" />
              ) : issues.length > 0 ? (
                <AlertTriangle size={32} className="text-red-600" />
              ) : (
                <Activity size={32} className="text-yellow-600" />
              )}

              <div>
                <p className="text-sm font-semibold">
                  System Status:{' '}
                  {validationStatus === 'pass'
                    ? 'Enterprise Ready'
                    : issues.length > 0
                      ? 'Issues Detected'
                      : 'No validation data yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last validation:{' '}
                  {validation?.timestamp ? new Date(validation.timestamp).toLocaleString() : 'Not run yet'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold">
                {passedCount}/{testCount || 0}
              </p>
              <p className="text-xs text-muted-foreground">Tests Passed</p>
            </div>
          </div>

          {issues.length > 0 && (
            <div className="mt-4 space-y-2">
              {issues.map((issue, index) => (
                <div key={`${issue.test || 'issue'}-${index}`} className="text-xs text-red-700 bg-red-100 px-3 py-2 rounded">
                  <strong>{issue.test || 'Issue'}:</strong> {issue.issue || 'Unknown issue'}
                </div>
              ))}
            </div>
          )}

          {validationQuery.isError && (
            <div className="mt-4 text-xs text-red-700 bg-red-100 px-3 py-2 rounded">
              Validation query failed. The dashboard is showing safe fallback data.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              Performance Score
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {safeNumber(performance?.performance_score)}/100
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {safeNumber(performance?.performance_score) >= 90
                ? 'Excellent'
                : safeNumber(performance?.performance_score) >= 70
                  ? 'Good'
                  : 'No analytics data yet'}
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
            <p className="text-3xl font-bold">{totalRecords.total.toLocaleString()}</p>
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              <div>Jobs: {totalRecords.jobs.toLocaleString()}</div>
              <div>Estimates: {totalRecords.estimates.toLocaleString()}</div>
              <div>Photos: {totalRecords.photos.toLocaleString()}</div>
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
                <span className="text-muted-foreground">Multi-Company</span>
                <span className="font-medium">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audit Logging</span>
                <span className="font-medium">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role Security</span>
                <span className="font-medium">Required</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {testCount > 0 ? (
        <div>
          <h2 className="text-sm font-semibold mb-3">Validation Test Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tests).map(([name, result]) => (
              <TestResultCard
                key={name}
                name={name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                result={result}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <Activity size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No validation data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run validation after deploying the required backend functions.
            </p>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 size={14} />
            Optimization Recommendations
          </h2>

          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <Card
                key={`${rec.category || 'recommendation'}-${index}`}
                className={rec.priority === 'high' ? 'border-red-300 bg-red-50' : 'border-border'}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            rec.priority === 'high'
                              ? 'destructive'
                              : rec.priority === 'medium'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {rec.priority || 'info'}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">
                          {rec.category || 'system'}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {rec.recommendation || 'Review system configuration.'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Impact: {rec.impact || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(validationQuery.isLoading || performanceQuery.isLoading) && (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Running enterprise validation tests...</p>
        </div>
      )}

      {(validationQuery.isError || performanceQuery.isError) && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4 flex items-center gap-3 text-sm text-yellow-800">
            <RefreshCw size={16} />
            Some analytics functions are unavailable. Safe fallback data is being shown.
          </CardContent>
        </Card>
      )}
    </div>
  );
}