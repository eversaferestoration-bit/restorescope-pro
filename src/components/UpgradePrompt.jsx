import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Zap, TrendingUp, Building2, Sparkles, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const TIER_ICONS = {
  starter: Zap,
  professional: TrendingUp,
  business: Building2,
  enterprise: Building2,
};

const TIER_COLORS = {
  starter: 'text-blue-600',
  professional: 'text-purple-600',
  business: 'text-amber-600',
  enterprise: 'text-slate-700',
};

export default function UpgradePrompt({ feature, onClose, showAfterUpgrade = false }) {
  const [showPlans, setShowPlans] = useState(false);

  const featureTiers = {
    'premium_analytics': {
      title: 'Premium Analytics',
      description: 'Unlock advanced analytics, trend visualizations, and performance insights.',
      requiredTier: 'professional',
      icon: Sparkles,
    },
    'adjuster_insights': {
      title: 'Adjuster Intelligence',
      description: 'Access historical adjuster data, approval rates, and negotiation strategies.',
      requiredTier: 'business',
      icon: TrendingUp,
    },
    'claim_defense': {
      title: 'Claim Defense Analysis',
      description: 'Get AI-powered defense scoring and risk mitigation recommendations.',
      requiredTier: 'business',
      icon: Zap,
    },
    'enterprise_features': {
      title: 'Enterprise Features',
      description: 'Multi-location management, custom pricing, and dedicated support.',
      requiredTier: 'enterprise',
      icon: Building2,
    },
    'ai_overage': {
      title: 'AI Analysis Limit Reached',
      description: 'You\'ve used all your included AI analyses this period. Upgrade for more.',
      requiredTier: 'professional',
      icon: Sparkles,
    },
    'default': {
      title: 'Upgrade Required',
      description: 'This feature is available on higher-tier plans.',
      requiredTier: 'professional',
      icon: Zap,
    },
  };

  const config = featureTiers[feature] || featureTiers['default'];
  const Icon = config.icon || Zap;

  if (showPlans) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold font-display">Choose Your Plan</h2>
            <button onClick={() => setShowPlans(false)} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              {config.description} Upgrade to unlock this and more features.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['starter', 'professional', 'business', 'enterprise'].map((tier) => {
                const TierIcon = TIER_ICONS[tier];
                return (
                  <div key={tier} className={cn(
                    'rounded-xl border-2 p-5 transition-all hover:shadow-lg',
                    tier === config.requiredTier ? 'border-primary bg-accent/30' : 'border-border'
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <TierIcon size={18} className={TIER_COLORS[tier]} />
                      <h3 className="font-semibold capitalize">{tier}</h3>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Core features</li>
                      {tier === 'professional' && (
                        <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Premium analytics</li>
                      )}
                      {tier === 'business' && (
                        <>
                          <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Adjuster insights</li>
                          <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Claim defense</li>
                        </>
                      )}
                      {tier === 'enterprise' && (
                        <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /> Enterprise features</li>
                      )}
                    </ul>
                    <Link
                      to="/billing"
                      onClick={() => setShowPlans(false)}
                      className={cn(
                        'mt-4 block w-full h-9 rounded-lg text-sm font-semibold text-center transition',
                        tier === config.requiredTier
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border border-border hover:bg-muted'
                      )}
                    >
                      {tier === 'enterprise' ? 'Contact Sales' : 'Select'}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-md w-full p-6 relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className={cn('w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center', TIER_COLORS[config.requiredTier], 'bg-opacity-10')}>
            <Icon size={24} className={TIER_COLORS[config.requiredTier]} />
          </div>
          <h2 className="text-lg font-bold font-display mb-2">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => setShowPlans(true)}
            className="w-full h-10 bg-primary hover:bg-primary/90"
          >
            View Plans <ArrowRight size={16} className="ml-2" />
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full h-10"
          >
            Maybe Later
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Upgrade anytime to access premium features
        </p>
      </div>
    </div>
  );
}