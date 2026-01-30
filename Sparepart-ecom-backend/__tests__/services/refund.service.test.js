/**
 * Refund service must never over-refund and must log/audit every request.
 * These tests cover validation and side effects when requesting refunds.
 */
jest.mock('../../modules/payments/payment.repo', () => ({
  getRefundableById: jest.fn(),
  markRefundInitiated: jest.fn(),
}));
jest.mock('../../modules/payments/payment.gateway.service', () => ({
  refund: jest.fn(),
}));
jest.mock('../../modules/audit/audit.service', () => ({
  log: jest.fn(),
}));

const paymentRepo = require('../../modules/payments/payment.repo');
const gatewayService = require('../../modules/payments/payment.gateway.service');
const audit = require('../../modules/audit/audit.service');
const refundService = require('../../modules/payments/refund.service');
const { AppError } = require('../../utils/apiResponse');

describe('RefundService.requestRefund', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initiates refund, calls gateway, and audits request', async () => {
    const payment = {
      _id: 'pay_1',
      orderId: 'ord_1',
      amount: 100,
      refundAmount: 20,
      paymentGateway: 'stripe',
      transactionId: 'txn_1',
    };
    paymentRepo.getRefundableById.mockResolvedValue(payment);

    const result = await refundService.requestRefund({
      paymentId: 'pay_1',
      amount: 50,
      reason: 'customer_remorse',
    });

    expect(paymentRepo.markRefundInitiated).toHaveBeenCalledWith('pay_1', 50);
    expect(gatewayService.refund).toHaveBeenCalledWith({
      payment,
      amount: 50,
      reason: 'customer_remorse',
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'refund_requested',
        target: { paymentId: 'pay_1', orderId: 'ord_1' },
        meta: { amount: 50, reason: 'customer_remorse' },
      }),
    );
    expect(result).toEqual({
      paymentId: 'pay_1',
      refundRequested: 50,
      remainingRefundable: 30,
    });
  });

  it('rejects invalid refund amounts to prevent over-refunds', async () => {
    paymentRepo.getRefundableById.mockResolvedValue({
      _id: 'pay_2',
      orderId: 'ord_2',
      amount: 80,
      refundAmount: 40,
    });

    await expect(
      refundService.requestRefund({ paymentId: 'pay_2', amount: 50 }),
    ).rejects.toBeInstanceOf(AppError);
    expect(paymentRepo.markRefundInitiated).not.toHaveBeenCalled();
    expect(gatewayService.refund).not.toHaveBeenCalled();
  });

  it('rejects when payment is not refundable', async () => {
    paymentRepo.getRefundableById.mockResolvedValue(null);

    await expect(
      refundService.requestRefund({ paymentId: 'missing', amount: 10 }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
