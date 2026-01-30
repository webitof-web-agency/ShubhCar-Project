/**
 * Payments service is high-risk: must stay idempotent and avoid double-charging.
 * These tests assert reuse of open intents, duplicate-key fallback, and safe retries.
 */
jest.mock('../../modules/payments/payment.repo', () => ({
  findOpenByOrderAndGateway: jest.fn(),
  findOpenLeanByOrderAndGateway: jest.fn(),
  failOpenPayments: jest.fn(),
  create: jest.fn(),
  findByIdLean: jest.fn(),
}));
jest.mock('../../modules/orders/order.repo', () => ({
  findById: jest.fn(),
}));
jest.mock('../../services/stripe.service', () => ({
  createIntent: jest.fn(),
}));
jest.mock('../../services/razorpay.service', () => ({
  createOrder: jest.fn(),
}));
jest.mock('../../queues/paymentRetry.queue', () => ({
  paymentRetryQueue: { add: jest.fn() },
}));
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
}));

const mongoose = require('mongoose');
const paymentRepo = require('../../modules/payments/payment.repo');
const orderRepo = require('../../modules/orders/order.repo');
const stripeService = require('../../services/stripe.service');
const razorpayService = require('../../services/razorpay.service');
const { paymentRetryQueue } = require('../../queues/paymentRetry.queue');
const paymentsService = require('../../modules/payments/payments.service');
const { AppError } = require('../../utils/apiResponse');

const mockSession = () => {
  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };
  mongoose.startSession.mockResolvedValue(session);
  return session;
};

const mockOrder = (overrides = {}) => ({
  _id: 'order-1',
  orderNumber: 'ORD-123',
  grandTotal: 500,
  orderStatus: 'created',
  paymentStatus: 'pending',
  session: jest.fn().mockResolvedValue({
    ...overrides,
  }),
  ...overrides,
});

describe('PaymentsService.initiatePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new payment intent when none exists and commits transaction', async () => {
    const session = mockSession();
    const orderDoc = mockOrder();
    orderRepo.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(orderDoc),
    });
    paymentRepo.findOpenByOrderAndGateway.mockResolvedValue(null);
    paymentRepo.failOpenPayments.mockResolvedValue();
    stripeService.createIntent.mockResolvedValue({
      id: 'pi_123',
      client_secret: 'cs_test',
    });
    paymentRepo.create.mockResolvedValue({
      _id: 'pay-1',
      gatewayResponse: { id: 'pi_123' },
    });

    const result = await paymentsService.initiatePayment({
      orderId: 'order-1',
      gateway: 'stripe',
    });

    expect(paymentRepo.failOpenPayments).toHaveBeenCalledWith(
      'order-1',
      'stripe',
      'new_initiation',
    );
    expect(paymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        paymentGateway: 'stripe',
        gatewayOrderId: 'pi_123',
        amount: 500,
      }),
      session,
    );
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(result).toEqual({
      paymentId: 'pay-1',
      gatewayPayload: { id: 'pi_123', client_secret: 'cs_test' },
    });
  });

  it('reuses open payment intent to stay idempotent', async () => {
    const session = mockSession();
    const orderDoc = mockOrder();
    orderRepo.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(orderDoc),
    });
    paymentRepo.findOpenByOrderAndGateway.mockResolvedValue({
      _id: 'pay-existing',
      gatewayResponse: { id: 'pi_existing' },
    });

    const result = await paymentsService.initiatePayment({
      orderId: 'order-1',
      gateway: 'stripe',
    });

    expect(paymentRepo.failOpenPayments).not.toHaveBeenCalled();
    expect(paymentRepo.create).not.toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(result).toEqual({
      paymentId: 'pay-existing',
      gatewayPayload: { id: 'pi_existing' },
    });
  });

  it('returns existing record on duplicate key error to avoid double-charges', async () => {
    mockSession();
    const orderDoc = mockOrder();
    orderRepo.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(orderDoc),
    });
    paymentRepo.findOpenByOrderAndGateway.mockResolvedValue(null);
    paymentRepo.failOpenPayments.mockResolvedValue();
    razorpayService.createOrder.mockResolvedValue({ id: 'rzp_123' });
    const dupErr = new Error('duplicate');
    dupErr.code = 11000;
    paymentRepo.create.mockRejectedValue(dupErr);
    paymentRepo.findOpenLeanByOrderAndGateway.mockResolvedValue({
      _id: 'pay-lean',
      gatewayResponse: { id: 'rzp_123' },
    });

    const result = await paymentsService.initiatePayment({
      orderId: 'order-1',
      gateway: 'razorpay',
    });

    expect(result).toEqual({
      paymentId: 'pay-lean',
      gatewayPayload: { id: 'rzp_123' },
    });
  });

  it('rejects when order is already paid or not eligible', async () => {
    mockSession();
    const orderDoc = mockOrder({ orderStatus: 'confirmed', paymentStatus: 'paid' });
    orderRepo.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(orderDoc),
    });

    await expect(
      paymentsService.initiatePayment({ orderId: 'order-1', gateway: 'stripe' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('PaymentsService.retryPayment', () => {
  it('enqueues retry when order is unpaid', async () => {
    orderRepo.findById.mockResolvedValue({
      _id: 'order-1',
      paymentStatus: 'pending',
    });

    const result = await paymentsService.retryPayment({
      orderId: 'order-1',
      gateway: 'stripe',
    });

    expect(paymentRetryQueue.add).toHaveBeenCalledWith(
      'retry',
      { orderId: 'order-1', gateway: 'stripe' },
      expect.objectContaining({
        attempts: 3,
        backoff: expect.any(Object),
      }),
    );
    expect(result).toEqual({ enqueued: true });
  });

  it('rejects retry for already paid orders to prevent duplicate charges', async () => {
    orderRepo.findById.mockResolvedValue({
      _id: 'order-1',
      paymentStatus: 'paid',
    });

    await expect(
      paymentsService.retryPayment({ orderId: 'order-1', gateway: 'stripe' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('PaymentsService.getStatus', () => {
  it('returns lean payment summary for dashboards', async () => {
    paymentRepo.findByIdLean.mockResolvedValue({
      _id: 'pay-123',
      orderId: 'ord-1',
      paymentGateway: 'stripe',
      status: 'success',
      amount: 200,
      currency: 'INR',
      transactionId: 'pi_1',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:01:00Z'),
    });

    const res = await paymentsService.getStatus('pay-123');

    expect(res).toMatchObject({
      paymentId: 'pay-123',
      orderId: 'ord-1',
      gateway: 'stripe',
      status: 'success',
      amount: 200,
      currency: 'INR',
      transactionId: 'pi_1',
    });
    expect(paymentRepo.findByIdLean).toHaveBeenCalledWith('pay-123');
  });

  it('throws when payment is missing to avoid leaking status', async () => {
    paymentRepo.findByIdLean.mockResolvedValue(null);

    await expect(paymentsService.getStatus('missing')).rejects.toBeInstanceOf(
      AppError,
    );
  });
});
