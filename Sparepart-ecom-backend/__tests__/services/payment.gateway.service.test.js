/**
 * Gateway service tests ensure we translate gateway responses correctly and call providers with safe params.
 */
let mockStripeInstance;
let mockRazorpayInstance;

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => {
    mockStripeInstance = {
      refunds: { create: jest.fn() },
      paymentIntents: { retrieve: jest.fn() },
    };
    return mockStripeInstance;
  }),
);

jest.mock('razorpay', () =>
  jest.fn().mockImplementation(() => {
    mockRazorpayInstance = {
      payments: {
        refund: jest.fn(),
        fetch: jest.fn(),
      },
    };
    return mockRazorpayInstance;
  }),
);

describe('PaymentGatewayService', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('refunds via stripe with smallest safe payload', async () => {
    const service = require('../../modules/payments/payment.gateway.service');
    mockStripeInstance.refunds.create.mockResolvedValue({ id: 're_1' });

    await service.refund({
      payment: {
        paymentGateway: 'stripe',
        transactionId: 'pi_1',
      },
      amount: 10.5,
      reason: 'customer_request',
    });

    expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_1',
      amount: 1050,
      reason: 'requested_by_customer',
      metadata: { reason: 'customer_request' },
    });
  });

  it('refunds via razorpay with converted amount', async () => {
    const service = require('../../modules/payments/payment.gateway.service');
    mockRazorpayInstance.payments.refund.mockResolvedValue({ id: 'rfnd_1' });

    await service.refund({
      payment: {
        paymentGateway: 'razorpay',
        gatewayOrderId: 'ord_razor',
      },
      amount: 20,
      reason: 'ops_adjustment',
    });

    expect(mockRazorpayInstance.payments.refund).toHaveBeenCalledWith(
      'ord_razor',
      {
        amount: 2000,
        notes: { reason: 'ops_adjustment' },
      },
    );
  });

  it('returns null when stripe payment has no intent id', async () => {
    const service = require('../../modules/payments/payment.gateway.service');
    const res = await service.fetchStatus({
      paymentGateway: 'stripe',
      gatewayOrderId: null,
    });
    expect(res).toBeNull();
  });

  it('maps stripe intent status and full refund detection', async () => {
    const service = require('../../modules/payments/payment.gateway.service');
    mockStripeInstance.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_2',
      status: 'succeeded',
      amount_received: 5000,
      charges: { data: [{ amount_refunded: 5000 }] },
    });

    const res = await service.fetchStatus({
      paymentGateway: 'stripe',
      gatewayOrderId: 'pi_2',
    });

    expect(res).toEqual({
      status: 'refunded',
      amount: 50,
      transactionId: 'pi_2',
      fullRefund: true,
    });
  });

  it('maps razorpay payment states and refund info', async () => {
    const service = require('../../modules/payments/payment.gateway.service');
    mockRazorpayInstance.payments.fetch.mockResolvedValue({
      id: 'pay_razor',
      status: 'captured',
      amount: 10000,
      amount_refunded: 2000,
    });

    const res = await service.fetchStatus({
      paymentGateway: 'razorpay',
      transactionId: 'pay_razor',
    });

    expect(res).toEqual({
      status: 'refunded',
      amount: 100,
      transactionId: 'pay_razor',
      fullRefund: false,
    });
  });
});
