import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@16.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

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
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    const base44 = createClientFromRequest(req);

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const companyId = subscription.metadata?.company_id;

      if (companyId) {
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          company_id: companyId
        });

        if (subs.length > 0) {
          const currentPlan = subs[0].plan;
          const newStatus = subscription.status;

          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: newStatus,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          });
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const companyId = subscription.metadata?.company_id;

      if (companyId) {
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          company_id: companyId
        });

        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: 'canceled',
            auto_renew: false,
            canceled_at: new Date().toISOString()
          });
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const companyId = invoice.metadata?.company_id;

      if (companyId) {
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          company_id: companyId
        });

        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: 'past_due'
          });
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
});