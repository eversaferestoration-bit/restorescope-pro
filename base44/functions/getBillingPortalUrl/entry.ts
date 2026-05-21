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

    const { company_id, return_url } = await req.json();

    const subscriptions = await base44.entities.Subscription.filter({
      company_id: company_id
    });

    if (subscriptions.length === 0 || !subscriptions[0].stripe_customer_id) {
      return Response.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    const stripeCustomerId = subscriptions[0].stripe_customer_id;

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: return_url || `${Deno.env.get('VITE_BASE44_APP_BASE_URL')}/billing`
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});