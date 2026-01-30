const paymentRepo = require('./payment.repo');
const orderService = require('../orders/orders.service');
const gatewayService = require('./payment.gateway.service');
const { error } = require('../../utils/apiResponse');
const audit = require('../audit/audit.service');

class RefundService {
  async requestRefund({ paymentId, amount, reason }) {
    const payment = await paymentRepo.getRefundableById(paymentId);
    if (!payment) error('Payment not refundable', 400);

    const refundable = payment.amount - (payment.refundAmount || 0);

    if (amount <= 0 || amount > refundable) {
      error('Invalid refund amount', 400);
    }

    // dY"' Do NOT mark refunded yet
    // Webhook will decide final state
    await paymentRepo.markRefundInitiated(paymentId, amount);

    // dY"? Gateway call (async safe)
    try {
      await gatewayService.refund({
        payment,
        amount,
        reason,
      });
    } catch (err) {
      await paymentRepo.markRefundInitiated(paymentId, -amount);
      throw err;
    }

    audit.log({
      actor: { type: 'system' },
      action: 'refund_requested',
      target: { paymentId, orderId: payment.orderId },
      meta: { amount, reason },
    });

    return {
      paymentId,
      refundRequested: amount,
      remainingRefundable: refundable - amount,
    };
  }
}

module.exports = new RefundService();
