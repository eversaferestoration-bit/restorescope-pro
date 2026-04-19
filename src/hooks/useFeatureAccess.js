import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/**
 * Hook to check if a user has access to a specific feature based on their subscription tier.
 * Returns: { hasAccess, loading, currentTier, upgradePrompt }
 */
export function useFeatureAccess(feature) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get user's company
        const profiles = await base44.entities.UserProfile.filter({ 
          user_id: user.id, 
          is_deleted: false 
        });
        
        if (!profiles.length) {
          setLoading(false);
          return;
        }

        const companyId = profiles[0].company_id;

        // Get subscription
        const subscriptions = await base44.entities.Subscription.filter({ 
          company_id: companyId, 
          status: 'active' 
        }, '-created_date', 1);

        if (!subscriptions.length) {
          // No subscription - check if feature is available on free tier
          setHasAccess(['core_estimating', 'basic_photos'].includes(feature));
          setCurrentTier('free');
          setLoading(false);
          return;
        }

        const subscription = subscriptions[0];

        // Get plan details
        const plans = await base44.entities.Plan.filter({ 
          code: subscription.provider_customer_id, 
          is_active: true 
        });

        if (!plans.length) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const plan = plans[0];
        setCurrentTier(plan.tier);

        // Check feature access based on tier
        const featureTiers = {
          'premium_analytics': ['professional', 'business', 'enterprise'],
          'adjuster_insights': ['business', 'enterprise'],
          'claim_defense': ['business', 'enterprise'],
          'enterprise_features': ['enterprise'],
          'custom_pricing': ['enterprise'],
          'multi_location': ['enterprise'],
          'api_access': ['enterprise'],
          'priority_support': ['professional', 'business', 'enterprise'],
          'core_estimating': ['starter', 'professional', 'business', 'enterprise', 'free'],
          'basic_photos': ['starter', 'professional', 'business', 'enterprise', 'free'],
        };

        const allowedTiers = featureTiers[feature] || [];
        setHasAccess(allowedTiers.includes(plan.tier));

      } catch (error) {
        console.error('Error checking feature access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user?.id, feature]);

  const upgradePrompt = () => setShowUpgradePrompt(true);

  return { 
    hasAccess, 
    loading, 
    currentTier, 
    showUpgradePrompt, 
    setShowUpgradePrompt,
    upgradePrompt 
  };
}

/**
 * Hook to check current usage against subscription limits
 */
export function useUsageLimits() {
  const [usage, setUsage] = useState({
    jobsUsed: 0,
    jobsLimit: 0,
    aiUsed: 0,
    aiLimit: 0,
    storageUsed: 0,
    storageLimit: 0,
    overageCharges: 0,
    limitReached: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const { user } = await base44.auth.me();
        if (!user) {
          setLoading(false);
          return;
        }

        const profiles = await base44.entities.UserProfile.filter({ 
          user_id: user.id, 
          is_deleted: false 
        });
        
        if (!profiles.length) {
          setLoading(false);
          return;
        }

        const companyId = profiles[0].company_id;

        const subscriptions = await base44.entities.Subscription.filter({ 
          company_id: companyId, 
          status: 'active' 
        }, '-created_date', 1);

        if (!subscriptions.length) {
          setLoading(false);
          return;
        }

        const subscription = subscriptions[0];

        const usageRecords = await base44.entities.UsageRecord.filter({ 
          subscription_id: subscription.id, 
          status: 'active' 
        }, '-period_start', 1);

        if (usageRecords.length) {
          const record = usageRecords[0];
          setUsage({
            jobsUsed: record.jobs_used || 0,
            jobsLimit: record.jobs_limit || 10,
            aiUsed: record.ai_analyses_used || 0,
            aiLimit: record.ai_analyses_limit || 50,
            storageUsed: record.storage_used_mb || 0,
            storageLimit: record.storage_limit_mb || 10240,
            overageCharges: record.overage_charges || 0,
            limitReached: (record.overage_jobs || 0) > 0 || (record.overage_ai || 0) > 0,
          });
        }
      } catch (error) {
        console.error('Error fetching usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  return { usage, loading };
}