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

    const { company_id, company_name, email } = await req.json();

    // Create Stripe customer
    const customer = await stripe.customers.create({
      name: company_name,
      email: email,
      metadata: { company_id }
    });

    // Create/update subscription record
    const existing = await base44.entities.Subscription.filter({
      company_id: company_id
    });

    if (existing.length > 0) {
      await base44.entities.Subscription.update(existing[0].id, {
        stripe_customer_id: customer.id
      });
    } else {
      await base44.entities.Subscription.create({
        company_id: company_id,
        stripe_customer_id: customer.id,
        plan: 'free'
      });
    }

    return Response.json({ stripe_customer_id: customer.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});