import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

// Price mapping for tiers
const TIER_PRICES = {
  personal: 'price_1SojEhFWVD2zRhT5Q5Ztjdk8',
  enterprise: 'price_1SojFRFWVD2zRhT5PHaUhVAW'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await req.json();

    if (!tier || !TIER_PRICES[tier]) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: TIER_PRICES[tier],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}?success=true`,
      cancel_url: `${req.headers.get('origin')}?canceled=true`,
      metadata: {
        tier: tier,
        user_email: user.email
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});