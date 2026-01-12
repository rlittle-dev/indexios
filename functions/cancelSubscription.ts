import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.stripe_subscription_id) {
      return Response.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Cancel the subscription at period end
    await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    return Response.json({ success: true, message: 'Subscription will be cancelled at the end of the billing period' });
  } catch (error) {
    console.error('Cancellation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});