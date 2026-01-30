const Stripe = require('stripe');
const env = require('../config/env');

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

class StripeService {
  async createIntent({ amount, currency, metadata }) {
    return stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // INR → paise
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  verifyWebhook(signature, rawBody) {
    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  }
}

module.exports = new StripeService();
