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

    const { company_id, new_plan, billing_cycle } = await req.json();

    if (!PLANS[new_plan]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const subscriptions = await base44.entities.Subscription.filter({
      company_id: company_id
    });

    if (subscriptions.length === 0 || !subscriptions[0].stripe_subscription_id) {
      return Response.json({ error: 'No active subscription' }, { status: 404 });
    }

    const subscription = subscriptions[0];
    const stripeSubId = subscription.stripe_subscription_id;
    const newPriceId = PLANS[new_plan][billing_cycle || subscription.billing_cycle];

    // Update subscription in Stripe
    const updated = await stripe.subscriptions.update(stripeSubId, {
      items: [{ id: subscription.stripe_subscription_id, price: newPriceId }],
      billing_cycle_anchor: 'now'
    });

    // Update local subscription
    await base44.entities.Subscription.update(subscription.id, {
      plan: new_plan,
      billing_cycle: billing_cycle || subscription.billing_cycle,
      status: updated.status,
      current_period_start: new Date(updated.current_period_start * 1000).toISOString(),
      current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
      features: PLAN_FEATURES[new_plan]
    });

    return Response.json({
      plan: new_plan,
      status: updated.status,
      current_period_end: new Date(updated.current_period_end * 1000).toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});