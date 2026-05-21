import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@16.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLANS = {
  starter: { monthly: 'price_starter_monthly', yearly: 'price_starter_yearly' },
  growth: { monthly: 'price_growth_monthly', yearly: 'price_growth_yearly' },
  agency: { monthly: 'price_agency_monthly', yearly: 'price_agency_yearly' }
};

const PLAN_FEATURES = {
  starter: {
    max_leads: 500,
    max_gbp_posts: 100,
    automation_enabled: false,
    storm_mode_enabled: false,
    ai_content_enabled: false,
    multi_location: false,
    white_label: false,
    advanced_analytics: false
  },
  growth: {
    max_leads: 5000,
    max_gbp_posts: 1000,
    automation_enabled: true,
    storm_mode_enabled: true,
    ai_content_enabled: true,
    multi_location: false,
    white_label: false,
    advanced_analytics: false
  },
  agency: {
    max_leads: 50000,
    max_gbp_posts: 10000,
    automation_enabled: true,
    storm_mode_enabled: true,
    ai_content_enabled: true,
    multi_location: true,
    white_label: true,
    advanced_analytics: true
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id, stripe_customer_id, plan, billing_cycle, trial_days = 14 } = await req.json();

    if (!PLANS[plan]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = PLANS[plan][billing_cycle];
    const trialDaysValue = plan === 'starter' ? trial_days : 0;

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripe_customer_id,
      items: [{ price: priceId }],
      trial_period_days: trialDaysValue,
      metadata: { company_id }
    });

    // Calculate trial end
    let trialEnd = null;
    if (subscription.trial_end) {
      trialEnd = new Date(subscription.trial_end * 1000).toISOString();
    }

    // Update subscription record
    const existing = await base44.entities.Subscription.filter({
      company_id: company_id
    });

    if (existing.length > 0) {
      await base44.entities.Subscription.update(existing[0].id, {
        stripe_subscription_id: subscription.id,
        plan: plan,
        status: subscription.status,
        billing_cycle: billing_cycle,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_end: trialEnd,
        features: PLAN_FEATURES[plan]
      });
    } else {
      await base44.entities.Subscription.create({
        company_id: company_id,
        stripe_customer_id: stripe_customer_id,
        stripe_subscription_id: subscription.id,
        plan: plan,
        status: subscription.status,
        billing_cycle: billing_cycle,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_end: trialEnd,
        features: PLAN_FEATURES[plan]
      });
    }

    return Response.json({
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      trial_end: trialEnd
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});