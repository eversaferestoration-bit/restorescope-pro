import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@16.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id, immediately = false } = await req.json();

    const subscriptions = await base44.entities.Subscription.filter({
      company_id: company_id
    });

    if (subscriptions.length === 0 || !subscriptions[0].stripe_subscription_id) {
      return Response.json({ error: 'No active subscription' }, { status: 404 });
    }

    const subscription = subscriptions[0];
    const stripeSubId = subscription.stripe_subscription_id;

    // Cancel in Stripe
    const canceled = await stripe.subscriptions.del(stripeSubId, {
      cancellation_details: {
        reason: 'cancellation_requested'
      }
    });

    // Update local subscription
    await base44.entities.Subscription.update(subscription.id, {
      status: 'canceled',
      auto_renew: false,
      canceled_at: new Date().toISOString()
    });

    return Response.json({
      status: 'canceled',
      current_period_end: new Date(canceled.current_period_end * 1000).toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});