import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, CreditCard, RotateCcw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BillingDashboard() {
  const companyId = useCompanyId();
  const { subscription, isLoading } = useSubscription();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('getBillingPortalUrl', {
        company_id: companyId,
        return_url: `${window.location.origin}/billing`
      });
      return response.data;
    }
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('updateSubscription', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', companyId] });
    }
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('cancelSubscription', {
        company_id: companyId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', companyId] });
      setShowCancelConfirm(false);
    }
  });

  const handleBillingPortal = async () => {
    const result = await billingPortalMutation.mutateAsync();
    window.open(result.url, '_blank');
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading billing information...</div>;
  }

  if (!subscription || subscription.plan === 'free') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Billing</h1>
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-8 text-center">
          <p className="text-foreground mb-4">You're currently on the Free plan</p>
          <Button onClick={() => navigate('/pricing')}>View Plans</Button>
        </div>
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your plan, payment method, and invoices</p>
      </div>

      {/* Current Plan */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Current Plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Plan</p>
            <p className="text-2xl font-bold text-foreground capitalize">{subscription.plan}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Billing Cycle</p>
            <p className="text-2xl font-bold text-foreground capitalize">{subscription.billing_cycle}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                subscription.status === 'active' ? 'bg-green-600' :
                subscription.status === 'trial' ? 'bg-blue-600' :
                subscription.status === 'past_due' ? 'bg-yellow-600' : 'bg-red-600'
              }`} />
              <p className="text-lg font-semibold text-foreground capitalize">{subscription.status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Banner */}
      {subscription.status === 'trial' && subscription.trial_end && (
        <div className="rounded-lg border border-blue-300/30 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100">Trial Ends on {formatDate(subscription.trial_end)}</p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Your subscription will automatically convert to a paid plan at the end of the trial period.
            </p>
          </div>
        </div>
      )}

      {/* Billing Period */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar size={20} /> Billing Period
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Period Start</p>
            <p className="text-lg font-semibold text-foreground">{formatDate(subscription.current_period_start)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Period End</p>
            <p className="text-lg font-semibold text-foreground">{formatDate(subscription.current_period_end)}</p>
          </div>
        </div>
      </div>

      {/* Upgrade/Downgrade */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <RotateCcw size={20} /> Change Plan
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          You can upgrade or downgrade your plan at any time. Changes take effect immediately.
        </p>
        <Button onClick={() => navigate('/pricing')} variant="outline">
          View All Plans
        </Button>
      </div>

      {/* Payment & Invoices */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <CreditCard size={20} /> Payment & Invoices
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          View and manage your payment methods, billing information, and invoice history.
        </p>
        <Button onClick={handleBillingPortal} disabled={billingPortalMutation.isPending}>
          {billingPortalMutation.isPending ? 'Loading...' : 'Go to Billing Portal'}
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-xl font-bold text-destructive mb-4 flex items-center gap-2">
          <Trash2 size={20} /> Danger Zone
        </h2>

        {!showCancelConfirm ? (
          <Button
            onClick={() => setShowCancelConfirm(true)}
            variant="destructive"
          >
            Cancel Subscription
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCancelConfirm(false)}
                variant="outline"
              >
                Keep Subscription
              </Button>
              <Button
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={cancelSubscriptionMutation.isPending}
                variant="destructive"
              >
                {cancelSubscriptionMutation.isPending ? 'Canceling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}