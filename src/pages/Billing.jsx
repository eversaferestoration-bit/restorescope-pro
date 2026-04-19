import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { CreditCard, Check, Zap, TrendingUp, Building2, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIER_COLORS = {
  starter: 'bg-blue-100 text-blue-700',
  professional: 'bg-purple-100 text-purple-700',
  business: 'bg-amber-100 text-amber-700',
  enterprise: 'bg-slate-800 text-white',
};

const TIER_ICONS = {
  starter: Zap,
  professional: TrendingUp,
  business: Building2,
  enterprise: Building2,
};

function PlanCard({ plan, currentPlanCode, onSelect, loading }) {
  const Icon = TIER_ICONS[plan.tier] || Zap;
  const isCurrent = plan.code === currentPlanCode;
  const isEnterprise = plan.tier === 'enterprise';

  return (
    <div className={cn(
      'rounded-2xl border-2 p-6 transition-all hover:shadow-lg',
      isCurrent ? 'border-primary bg-accent/30' : 'border-border bg-card',
      isEnterprise && !isCurrent && 'border-slate-700 bg-slate-800/10'
    )}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', TIER_COLORS[plan.tier])}>
              <Icon size={16} />
            </div>
            <h3 className="text-lg font-bold font-display">{plan.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{plan.tier} tier</p>
        </div>
        {isCurrent && (
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
            Current Plan
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold font-display">${plan.monthly_price}</span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
        {plan.annual_price && (
          <p className="text-xs text-muted-foreground mt-1">
            ${plan.annual_price}/year (save {Math.round((1 - plan.annual_price / (plan.monthly_price * 12)) * 100)}%)
          </p>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Check size={14} className="text-green-600" />
          <span>{plan.seat_limit} {plan.seat_limit === 1 ? 'seat' : 'seats'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check size={14} className="text-green-600" />
          <span>{plan.monthly_job_limit} jobs/month</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check size={14} className="text-green-600" />
          <span>{plan.monthly_ai_limit} AI analyses/month</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check size={14} className="text-green-600" />
          <span>{plan.storage_limit_mb} MB storage</span>
        </div>
        {plan.overage_job_price && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle size={12} />
            <span>Overage: ${plan.overage_job_price}/job</span>
          </div>
        )}
        {plan.overage_ai_price && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle size={12} />
            <span>Overage: ${plan.overage_ai_price}/AI analysis</span>
          </div>
        )}
        {plan.premium_analytics && (
          <div className="flex items-center gap-2 text-sm text-purple-600">
            <Sparkles size={14} />
            <span>Premium analytics</span>
          </div>
        )}
        {plan.enterprise_features && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 size={14} />
            <span>Enterprise features</span>
          </div>
        )}
      </div>

      {!isCurrent && (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className={cn(
            'w-full h-10 rounded-lg text-sm font-semibold transition',
            isEnterprise
              ? 'bg-slate-800 text-white hover:bg-slate-700'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
            loading && 'opacity-60 cursor-not-allowed'
          )}
        >
          {loading ? <Loader2 size={16} className="animate-spin inline" /> : isEnterprise ? 'Contact Sales' : 'Select Plan'}
        </button>
      )}
    </div>
  );
}

function UsageSummary({ subscription }) {
  const { data: usageRecord } = useQuery({
    queryKey: ['current-usage', subscription?.id],
    queryFn: () => base44.entities.UsageRecord.filter({ 
      subscription_id: subscription.id, 
      status: 'active' 
    }, '-period_start', 1),
    select: (d) => d[0],
    enabled: !!subscription?.id,
  });

  if (!usageRecord) return null;

  const jobUsagePercent = (usageRecord.jobs_used / usageRecord.jobs_limit) * 100;
  const aiUsagePercent = (usageRecord.ai_analyses_used / usageRecord.ai_analyses_limit) * 100;

  return (
    <div className="bg-card rounded-xl border border-border p-5 mb-6">
      <h3 className="text-sm font-semibold font-display mb-4">Current Period Usage</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Jobs</span>
            <span className="font-medium">{usageRecord.jobs_used} / {usageRecord.jobs_limit}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn('h-full transition-all', jobUsagePercent > 90 ? 'bg-destructive' : jobUsagePercent > 70 ? 'bg-amber-500' : 'bg-primary')}
              style={{ width: `${Math.min(jobUsagePercent, 100)}%` }}
            />
          </div>
          {usageRecord.overage_jobs > 0 && (
            <p className="text-xs text-destructive mt-1">
              {usageRecord.overage_jobs} overage jobs (${(usageRecord.overage_jobs * 5).toFixed(2)})
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">AI Analyses</span>
            <span className="font-medium">{usageRecord.ai_analyses_used} / {usageRecord.ai_analyses_limit}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn('h-full transition-all', aiUsagePercent > 90 ? 'bg-destructive' : aiUsagePercent > 70 ? 'bg-amber-500' : 'bg-primary')}
              style={{ width: `${Math.min(aiUsagePercent, 100)}%` }}
            />
          </div>
          {usageRecord.overage_ai > 0 && (
            <p className="text-xs text-destructive mt-1">
              {usageRecord.overage_ai} overage analyses (${(usageRecord.overage_ai * 2).toFixed(2)})
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-medium">{(usageRecord.storage_used_mb / 1024).toFixed(1)} GB / {(usageRecord.storage_limit_mb / 1024).toFixed(0)} GB</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn('h-full transition-all', (usageRecord.storage_used_mb / usageRecord.storage_limit_mb) > 0.9 ? 'bg-destructive' : 'bg-primary')}
              style={{ width: `${Math.min((usageRecord.storage_used_mb / usageRecord.storage_limit_mb) * 100, 100)}%` }}
            />
          </div>
        </div>

        {usageRecord.overage_charges > 0 && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overage Charges</span>
              <span className="font-semibold text-destructive">${usageRecord.overage_charges.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Will be billed at period end</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Billing() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: company } = useQuery({
    queryKey: ['user-company'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
      if (!profiles.length) return null;
      const companies = await base44.entities.Company.filter({ id: profiles[0].company_id, is_deleted: false });
      return companies[0];
    },
    enabled: !!user?.id,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.Plan.filter({ is_active: true }, 'monthly_price'),
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', company?.id],
    queryFn: () => base44.entities.Subscription.filter({ company_id: company?.id }, '-created_date', 1),
    select: (d) => d[0],
    enabled: !!company?.id,
  });

  const selectPlanMutation = useMutation({
    mutationFn: async (plan) => {
      if (plan.tier === 'enterprise') {
        // For enterprise, create a lead/contact request
        return { success: true, enterprise: true };
      }
      
      // For other plans, update/create subscription
      if (subscription?.id) {
        await base44.entities.Subscription.update(subscription.id, {
          provider_customer_id: plan.code,
          status: 'active',
          billing_cycle: 'monthly',
        });
      } else {
        await base44.entities.Subscription.create({
          company_id: company.id,
          provider: 'base44',
          provider_customer_id: plan.code,
          status: 'active',
          billing_cycle: 'monthly',
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
      return { success: true, plan };
    },
    onSuccess: () => {
      qc.invalidateQueries(['subscription', company?.id]);
      setSelectedPlan(null);
    },
  });

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan.code);
    selectPlanMutation.mutate(plan);
  };

  const starterPlan = plans.find(p => p.tier === 'starter');
  const professionalPlan = plans.find(p => p.tier === 'professional');
  const businessPlan = plans.find(p => p.tier === 'business');
  const enterprisePlan = plans.find(p => p.tier === 'enterprise');

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and usage</p>
      </div>

      {subscription && <UsageSummary subscription={subscription} />}

      <div className="mb-6">
        <h2 className="text-lg font-semibold font-display mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {starterPlan && (
            <PlanCard
              plan={starterPlan}
              currentPlanCode={subscription?.provider_customer_id}
              onSelect={handleSelectPlan}
              loading={loading && selectedPlan === starterPlan.code}
            />
          )}
          {professionalPlan && (
            <PlanCard
              plan={professionalPlan}
              currentPlanCode={subscription?.provider_customer_id}
              onSelect={handleSelectPlan}
              loading={loading && selectedPlan === professionalPlan.code}
            />
          )}
          {businessPlan && (
            <PlanCard
              plan={businessPlan}
              currentPlanCode={subscription?.provider_customer_id}
              onSelect={handleSelectPlan}
              loading={loading && selectedPlan === businessPlan.code}
            />
          )}
          {enterprisePlan && (
            <PlanCard
              plan={enterprisePlan}
              currentPlanCode={subscription?.provider_customer_id}
              onSelect={handleSelectPlan}
              loading={loading && selectedPlan === enterprisePlan.code}
            />
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold font-display mb-3">Plan Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium mb-2">All plans include:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Core estimating tools</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Photo analysis AI</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Scope generation</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Basic reporting</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Premium & Business add:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Premium analytics</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Adjuster insights</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Claim defense</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Priority support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}