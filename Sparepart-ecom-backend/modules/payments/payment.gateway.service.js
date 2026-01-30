const Stripe = require('stripe');
const Razorpay = require('razorpay');
const env = require('../../config/env');

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

const razorpay = env.RAZORPAY_KEY_ID
  ? new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  : null;

class PaymentGatewayService {
  async refund({ payment, amount, reason }) {
    if (payment.paymentGateway === 'stripe') {
      if (!stripe) throw new Error('Stripe not configured');
      return stripe.refunds.create({
        payment_intent: payment.transactionId || payment.gatewayOrderId,
        amount: Math.round(amount * 100),
        reason: 'requested_by_customer',
        metadata: { reason },
      });
    }

    if (payment.paymentGateway === 'razorpay') {
      if (!razorpay) throw new Error('Razorpay not configured');
      return razorpay.payments.refund(
        payment.transactionId || payment.gatewayOrderId,
        {
          amount: Math.round(amount * 100),
          notes: { reason },
        },
      );
    }

    throw new Error('Unsupported gateway');
  }

  async fetchStatus(payment) {
    if (payment.paymentGateway === 'stripe') {
      if (!stripe) throw new Error('Stripe not configured');
      if (!payment.gatewayOrderId) return null;

      const intent = await stripe.paymentIntents.retrieve(
        payment.gatewayOrderId,
      );

      let status = 'pending';
      if (intent.status === 'succeeded') status = 'success';
      if (
        intent.status === 'requires_payment_method' ||
        intent.status === 'canceled'
      )
        status = 'failed';

      const received = intent.amount_received ?? intent.amount ?? 0;
      const amount = typeof received === 'number' ? received / 100 : undefined;

      const charge = intent.charges?.data?.[0];
      const refundedCents = charge?.amount_refunded ?? 0;
      const fullRefund =
        typeof refundedCents === 'number' &&
        typeof intent.amount_received === 'number' &&
        refundedCents >= intent.amount_received;

      if (refundedCents > 0) status = 'refunded';

      return {
        status,
        amount,
        transactionId: intent.id,
        fullRefund,
      };
    }

    if (payment.paymentGateway === 'razorpay') {
      if (!razorpay) throw new Error('Razorpay not configured');
      const id = payment.transactionId || payment.gatewayOrderId;
      if (!id) return null;

      const paymentData = await razorpay.payments.fetch(id);

      let status = 'pending';
      if (paymentData.status === 'captured') status = 'success';
      if (paymentData.status === 'failed') status = 'failed';

      const amount =
        typeof paymentData.amount === 'number'
          ? paymentData.amount / 100
          : undefined;

      const refunded = paymentData.amount_refunded || 0;
      const fullRefund =
        typeof refunded === 'number' &&
        typeof paymentData.amount === 'number' &&
        refunded >= paymentData.amount;

      if (refunded > 0) status = 'refunded';

      return {
        status,
        amount,
        transactionId: paymentData.id,
        fullRefund,
      };
    }

    throw new Error('Unsupported gateway');
  }
}

module.exports = new PaymentGatewayService();
