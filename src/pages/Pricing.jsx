import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams',
    monthlyPrice: 49,
    yearlyPrice: 490,
    features: {
      'Limited Leads (500/month)': true,
      'Limited GBP Posts (100/month)': true,
      'Basic Reporting': true,
      'Email Support': true,
      'Automation': false,
      'Storm Mode': false,
      'AI Content Generation': false,
      'Multi-Location': false,
      'White Label': false,
      'Advanced Analytics': false,
    }
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For scaling businesses',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    popular: true,
    features: {
      'Unlimited Leads': true,
      'Unlimited GBP Posts': true,
      'Advanced Reporting': true,
      'Priority Support': true,
      'Automation Engine': true,
      'Storm Mode': true,
      'AI Content Generation': true,
      'Multi-Location': false,
      'White Label': false,
      'Advanced Analytics': false,
    }
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'For agencies & enterprises',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    features: {
      'Unlimited Everything': true,
      'Advanced Reporting': true,
      'Dedicated Support': true,
      'Automation Engine': true,
      'Storm Mode': true,
      'AI Content Generation': true,
      'Multi-Location Support': true,
      'White Label Options': true,
      'Advanced Analytics': true,
      'Custom Integrations': true,
    }
  }
];

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const companyId = useCompanyId();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const queryClient = useQueryClient();

  const createCustomerMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createStripeCustomer', data);
      return response.data;
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createSubscription', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', companyId] });
    }
  });

  const handleSelectPlan = async (planId) => {
    setLoadingPlan(planId);
    try {
      let stripeCustomerId = subscription?.stripe_customer_id;

      if (!stripeCustomerId) {
        const customerResult = await createCustomerMutation.mutateAsync({
          company_id: companyId,
          company_name: user?.company_name || 'Company',
          email: user?.email
        });
        stripeCustomerId = customerResult.stripe_customer_id;
      }

      await createSubscriptionMutation.mutateAsync({
        company_id: companyId,
        stripe_customer_id: stripeCustomerId,
        plan: planId,
        billing_cycle: billingCycle,
        trial_days: 14
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const currentPlan = subscription?.plan;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-3">Simple, Transparent Pricing</h1>
        <p className="text-lg text-muted-foreground mb-8">Choose the plan that fits your business</p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              billingCycle === 'yearly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Yearly
            <span className="ml-2 text-xs bg-destructive text-white px-2 py-0.5 rounded">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.monthlyPrice : Math.floor(plan.yearlyPrice);
          const isCurrentPlan = currentPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`rounded-xl border-2 p-8 flex flex-col transition-all ${
                plan.popular
                  ? 'border-primary bg-primary/5 md:scale-105'
                  : isCurrentPlan
                  ? 'border-primary bg-card'
                  : 'border-border bg-card'
              }`}
            >
              {plan.popular && (
                <div className="inline-block w-fit mb-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">${price}</span>
                <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isCurrentPlan || loadingPlan === plan.id}
                variant={plan.popular ? 'default' : 'outline'}
                className="w-full mb-8"
              >
                {isCurrentPlan ? 'Current Plan' : 'Get Started'}
              </Button>

              {/* Features */}
              <div className="space-y-3 flex-1">
                {Object.entries(plan.features).map(([feature, included]) => (
                  <div key={feature} className="flex items-start gap-3">
                    {included ? (
                      <Check size={18} className="text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <X size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <span className={included ? 'text-foreground text-sm' : 'text-muted-foreground text-sm line-through'}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trial Info */}
      <div className="mt-12 p-6 bg-accent/10 border border-accent/30 rounded-lg text-center">
        <p className="text-sm text-foreground">
          All plans include a <strong>14-day free trial</strong>. No credit card required to get started.
        </p>
      </div>
    </div>
  );
}