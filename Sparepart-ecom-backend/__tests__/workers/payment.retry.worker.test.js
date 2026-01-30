/**
 * Payment retry worker should create a fresh intent only when safe.
 */
jest.mock('bullmq', () => {
  const handlers = {};
  const Worker = jest.fn((name, processor) => {
    handlers[name] = processor;
    return { on: jest.fn() };
  });
  Worker.__handlers = handlers;
  return { Worker };
});
jest.mock('../../config/queue', () => ({ connection: {} }));
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../modules/payments/payment.repo', () => ({
  findOpenByOrderAndGateway: jest.fn(),
  failOpenPayments: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../modules/orders/order.repo', () => ({
  findById: jest.fn(),
}));

const { Worker } = require('bullmq');
const paymentRepo = require('../../modules/payments/payment.repo');
const orderRepo = require('../../modules/orders/order.repo');

const loadHandler = () => {
  require('../../workers/payment-retry.worker');
  return Worker.__handlers['payment-retry'];
};

describe('payment-retry worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aborts when order is already paid to avoid duplicate charge attempts', async () => {
    const handler = loadHandler();
    orderRepo.findById.mockResolvedValue({
      _id: 'ord_1',
      paymentStatus: 'paid',
      orderStatus: 'created',
    });

    await handler({
      data: { orderId: 'ord_1', gateway: 'stripe', reason: 'timeout' },
    });

    expect(paymentRepo.failOpenPayments).not.toHaveBeenCalled();
    expect(paymentRepo.create).not.toHaveBeenCalled();
  });

  it('creates new intent after failing open ones when safe to retry', async () => {
    const handler = loadHandler();
    orderRepo.findById.mockResolvedValue({
      _id: 'ord_2',
      paymentStatus: 'pending',
      orderStatus: 'created',
      payableAmount: 150,
    });
    paymentRepo.findOpenByOrderAndGateway.mockResolvedValue(null);
    paymentRepo.create.mockResolvedValue({ _id: 'pay_new' });

    await handler({
      data: { orderId: 'ord_2', gateway: 'razorpay', reason: 'network_error' },
    });

    expect(paymentRepo.failOpenPayments).toHaveBeenCalledWith(
      'ord_2',
      'razorpay',
      'network_error',
    );
    expect(paymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ord_2',
        paymentGateway: 'razorpay',
        amount: 150,
        metadata: expect.objectContaining({ retry: true, retryReason: 'network_error' }),
      }),
    );
  });

  it('skips creating intent when an open payment already exists', async () => {
    const handler = loadHandler();
    orderRepo.findById.mockResolvedValue({
      _id: 'ord_3',
      paymentStatus: 'pending',
      orderStatus: 'created',
      payableAmount: 200,
    });
    paymentRepo.findOpenByOrderAndGateway.mockResolvedValue({
      _id: 'pay_open',
    });

    await handler({
      data: { orderId: 'ord_3', gateway: 'stripe' },
    });

    expect(paymentRepo.failOpenPayments).not.toHaveBeenCalled();
    expect(paymentRepo.create).not.toHaveBeenCalled();
  });
});
