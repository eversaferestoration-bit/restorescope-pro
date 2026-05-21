import { useSubscription } from '@/hooks/useSubscription';
import { AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionGate({ children, requiredPlan = 'growth', featureName = '' }) {
  const { subscription, isLoading, hasFeature, isOnPlan } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="p-6 text-center">Loading subscription status...</div>;
  }

  if (!subscription || subscription.plan === 'free') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6 rounded-lg border border-destructive/20 bg-destructive/5">
        <Lock size={32} className="text-destructive" />
        <div className="text-center">
          <h3 className="font-semibold text-lg text-foreground mb-1">Premium Feature</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {featureName ? `${featureName} is` : 'This feature is'} only available on paid plans
          </p>
          <Button onClick={() => navigate('/billing')}>View Plans</Button>
        </div>
      </div>
    );
  }

  const planOrder = { starter: 0, growth: 1, agency: 2 };
  const currentPlanOrder = planOrder[subscription.plan] || -1;
  const requiredPlanOrder = planOrder[requiredPlan] || 0;

  if (currentPlanOrder < requiredPlanOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6 rounded-lg border border-accent/20 bg-accent/5">
        <AlertCircle size={32} style={{ color: '#e05a1c' }} />
        <div className="text-center">
          <h3 className="font-semibold text-lg text-foreground mb-1">Upgrade Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {featureName || 'This feature'} requires the {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan or higher
          </p>
          <Button onClick={() => navigate('/billing')}>Upgrade Now</Button>
        </div>
      </div>
    );
  }

  return children;
}