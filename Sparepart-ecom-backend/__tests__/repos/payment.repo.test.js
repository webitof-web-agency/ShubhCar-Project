/**
 * Payment repo integration tests: protect idempotency/cleanup and reconciliation queries.
 */
const mongoose = require('mongoose');
const paymentRepo = require('../../modules/payments/payment.repo');
const Payment = require('../../models/Payment.model');
const { PAYMENT_RECORD_STATUS } = require('../../constants/paymentStatus');
const {
  connectTestDB,
  clearDatabase,
  disconnectTestDB,
} = require('../helpers/mongo');

describe('PaymentRepository', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it('marks open payments failed for an order without touching success/refunded', async () => {
    const orderId = new mongoose.Types.ObjectId();
    await Payment.create([
      {
        orderId,
        paymentGateway: 'stripe',
        amount: 100,
        status: PAYMENT_RECORD_STATUS.CREATED,
      },
      {
        orderId,
        paymentGateway: 'razorpay',
        amount: 100,
        status: PAYMENT_RECORD_STATUS.SUCCESS,
      },
    ]);

    await paymentRepo.markFailedByOrder(orderId, 'retry_new_attempt');

    const docs = await Payment.find({ orderId }).lean();
    const created = docs.find((d) => d.paymentGateway === 'stripe');
    const success = docs.find((d) => d.paymentGateway === 'razorpay');

    expect(created.status).toBe(PAYMENT_RECORD_STATUS.FAILED);
    expect(created.failureReason).toBe('retry_new_attempt');
    expect(success.status).toBe(PAYMENT_RECORD_STATUS.SUCCESS);
  });

  it('finds pending payments for reconciliation using createdAt cutoff', async () => {
    const recent = await Payment.create({
      orderId: new mongoose.Types.ObjectId(),
      paymentGateway: 'stripe',
      amount: 50,
      status: PAYMENT_RECORD_STATUS.CREATED,
      createdAt: new Date(),
    });
    const stale = await Payment.create({
      orderId: new mongoose.Types.ObjectId(),
      paymentGateway: 'razorpay',
      amount: 75,
      status: PAYMENT_RECORD_STATUS.CREATED,
      createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
    });

    const pending = await paymentRepo.findPendingForReconciliation(15);
    const ids = pending.map((p) => p._id.toString());

    expect(ids).toContain(stale._id.toString());
    expect(ids).not.toContain(recent._id.toString());
  });

  it('applies partial and full refunds with correct status + counters', async () => {
    const payment = await Payment.create({
      orderId: new mongoose.Types.ObjectId(),
      paymentGateway: 'stripe',
      amount: 120,
      refundAmount: 20,
      status: PAYMENT_RECORD_STATUS.SUCCESS,
    });

    const partial = await paymentRepo.applyRefund(payment._id, 50, false);
    expect(partial.refundAmount).toBe(70);
    expect(partial.status).toBe('partially_refunded');

    const full = await paymentRepo.applyRefund(payment._id, 50, true);
    expect(full.refundAmount).toBe(120);
    expect(full.status).toBe(PAYMENT_RECORD_STATUS.REFUNDED);
  });

  it('finalizes refund state without dropping success when partial', async () => {
    const payment = await Payment.create({
      orderId: new mongoose.Types.ObjectId(),
      paymentGateway: 'razorpay',
      amount: 90,
      refundAmount: 30,
      status: 'partially_refunded',
    });

    const stillSuccess = await paymentRepo.finalizeRefund(payment._id, false);
    expect(stillSuccess.status).toBe(PAYMENT_RECORD_STATUS.SUCCESS);

    const full = await paymentRepo.finalizeRefund(payment._id, true);
    expect(full.status).toBe(PAYMENT_RECORD_STATUS.REFUNDED);
  });
});
