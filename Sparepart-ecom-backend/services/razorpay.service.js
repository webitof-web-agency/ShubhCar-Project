const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('../config/env');

const createClient = ({ keyId, keySecret } = {}) =>
  new Razorpay({
    key_id: keyId || env.RAZORPAY_KEY_ID,
    key_secret: keySecret || env.RAZORPAY_KEY_SECRET,
  });

class RazorpayService {
  async createOrder({ amount, currency, receipt, keyId, keySecret }) {
    const client = createClient({ keyId, keySecret });
    return client.orders.create({
      amount: Math.round(amount * 100), // INR -> paise
      currency,
      receipt,
      payment_capture: 1,
    });
  }

  verifyWebhook(signature, body, webhookSecret) {
    const expected = crypto
      .createHmac('sha256', webhookSecret || env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== signature) {
      throw new Error('Invalid Razorpay webhook signature');
    }
  }
}

module.exports = new RazorpayService();
