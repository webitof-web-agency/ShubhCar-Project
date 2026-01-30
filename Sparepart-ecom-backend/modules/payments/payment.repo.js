const Payment = require('../../models/Payment.model');
const { PAYMENT_RECORD_STATUS } = require('../../constants/paymentStatus');

/**
 * PAYMENT REPOSITORY
 * ------------------
 * Conventions:
 * - Methods with "Doc" return Mongoose Documents (for workers / transactions / save()).
 * - Methods with "Lean" return plain JS objects (for APIs / dashboards).
 * - Other methods default to Document return to preserve backwards compatibility
 *   (since your existing code likely expects docs in workers).
 */
class PaymentRepository {
  /* =====================
     CREATE
  ====================== */
  async create(data, session) {
    return Payment.create([data], { session }).then((r) => r[0]);
  }

  /* =====================
     IDEMPOTENCY
  ====================== */

  // For idempotency (only one open intent)
  // NOTE: return Document by default to match your current behavior
  findOpenByOrderAndGateway(orderId, gateway) {
    return Payment.findOne({
      orderId,
      paymentGateway: gateway,
      status: PAYMENT_RECORD_STATUS.CREATED,
    });
  }

  // Lean version for API/services that don't need doc methods
  findOpenLeanByOrderAndGateway(orderId, gateway) {
    return Payment.findOne({
      orderId,
      paymentGateway: gateway,
      status: PAYMENT_RECORD_STATUS.CREATED,
    }).lean();
  }

  // Stronger idempotency helper: if any CREATED/SUCCESS exists, reuse it
  // (Use this in initiatePayment to avoid duplicates under race)
  findInitiatedByOrderAndGateway(orderId, gateway) {
    return Payment.findOne({
      orderId,
      paymentGateway: gateway,
      status: {
        $in: [PAYMENT_RECORD_STATUS.CREATED, PAYMENT_RECORD_STATUS.SUCCESS],
      },
    }).lean();
  }

  /* =====================
     WEBHOOK LOOKUPS
  ====================== */

  // Webhook lookup by gateway payment id
  findByGatewayPaymentId(transactionId) {
    return Payment.findOne({ transactionId });
  }

  findByGatewayPaymentIdLean(transactionId) {
    return Payment.findOne({ transactionId }).lean();
  }

  // Webhook fallback lookup
  findByGatewayOrderId(gatewayOrderId) {
    return Payment.findOne({ gatewayOrderId });
  }

  findByGatewayOrderIdLean(gatewayOrderId) {
    return Payment.findOne({ gatewayOrderId }).lean();
  }

  /* =====================
     ORDER LOOKUPS
  ====================== */

  // Always return DOCUMENT for workers
  findLatestDocByOrder(orderId, session) {
    const query = Payment.findOne({ orderId }).sort({ createdAt: -1 });
    if (session) query.session(session);
    return query;
  }

  // Read-only use (dashboards)
  findLatestLeanByOrder(orderId, session) {
    const query = Payment.findOne({ orderId }).sort({ createdAt: -1 });
    if (session) query.session(session);
    return query.lean();
  }

  // Convenience alias to keep legacy references working
  findLatestByOrder(orderId, session) {
    return this.findLatestDocByOrder(orderId, session);
  }

  findById(id) {
    return Payment.findById(id); // Document (kept)
  }

  findByIdLean(id) {
    return Payment.findById(id).lean();
  }

  /* =====================
     UPDATE
  ====================== */

  updateById(id, update) {
    return Payment.findByIdAndUpdate(id, update, { new: true }); // Document (kept)
  }

  updateStatus(id, update) {
    return Payment.findByIdAndUpdate(id, update, { new: true }); // Document (kept)
  }

  // Useful explicit helpers (optional but solid)
  markSuccess(id, { transactionId, gatewayResponse } = {}) {
    const update = {
      status: PAYMENT_RECORD_STATUS.SUCCESS,
    };
    if (transactionId) update.transactionId = transactionId;
    if (gatewayResponse) update.gatewayResponse = gatewayResponse;
    return Payment.findByIdAndUpdate(id, update, { new: true });
  }

  markFailed(id, { reason = 'payment_failed', gatewayResponse } = {}) {
    const update = {
      status: PAYMENT_RECORD_STATUS.FAILED,
      failureReason: reason,
    };
    if (gatewayResponse) update.gatewayResponse = gatewayResponse;
    return Payment.findByIdAndUpdate(id, update, { new: true });
  }

  /* =====================
     FAILURE / CLEANUP
  ====================== */

  // Mark all non-final payments as failed
  async markFailedByOrder(orderId, reason = 'payment_failed', session) {
    return Payment.updateMany(
      {
        orderId,
        status: {
          $nin: [
            PAYMENT_RECORD_STATUS.SUCCESS,
            PAYMENT_RECORD_STATUS.REFUNDED,
            PAYMENT_RECORD_STATUS.FAILED,
          ],
        },
      },
      {
        status: PAYMENT_RECORD_STATUS.FAILED,
        failureReason: reason,
      },
      { session },
    );
  }

  // Fail all open payments for gateway before retry
  async failOpenPayments(orderId, gateway, reason = 'retry_new_intent') {
    return Payment.updateMany(
      {
        orderId,
        paymentGateway: gateway,
        status: PAYMENT_RECORD_STATUS.CREATED,
      },
      {
        status: PAYMENT_RECORD_STATUS.FAILED,
        failureReason: reason,
      },
    );
  }

  /* =====================
     REFUNDS
  ====================== */

  async applyRefund(paymentId, amount, isFullRefund = false) {
    const update = {
      $inc: { refundAmount: amount },
    };

    update.status = isFullRefund
      ? PAYMENT_RECORD_STATUS.REFUNDED
      : PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED;

    return Payment.findByIdAndUpdate(paymentId, update, { new: true });
  }

  async getRefundableById(paymentId) {
    return Payment.findOne({
      _id: paymentId,
      status: PAYMENT_RECORD_STATUS.SUCCESS,
    });
  }

  async markRefundInitiated(paymentId, amount) {
    return Payment.findByIdAndUpdate(
      paymentId,
      { $inc: { refundAmount: amount } },
      { new: true },
    );
  }

  async finalizeRefund(paymentId, isFullRefund) {
    return Payment.findByIdAndUpdate(
      paymentId,
      {
        status: isFullRefund
          ? PAYMENT_RECORD_STATUS.REFUNDED
          : PAYMENT_RECORD_STATUS.SUCCESS,
      },
      { new: true },
    );
  }

  /* =====================
     RECONCILIATION
  ====================== */

  findPendingForReconciliation(minutesAgo = 15) {
    const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);

    return Payment.find({
      status: PAYMENT_RECORD_STATUS.CREATED,
      createdAt: { $lte: cutoff },
    });
  }

  findRecent(hours = 48) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Payment.find({ createdAt: { $gte: cutoff } });
  }
  /* =====================
     LIST
  ====================== */
  list(filter = {}, { limit = 20, page = 1 } = {}) {
    const safeLimit = Math.min(Number(limit) || 20, 100);
    const safePage = Math.max(Number(page) || 1, 1);

    return Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit)
      .lean();
  }
}

module.exports = new PaymentRepository();
