/**
 * Payment webhook worker must transition payment + order safely per gateway events.
 * These tests execute the registered processor directly with mocked repos/services.
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
  findByGatewayOrderIdLean: jest.fn(),
  findByGatewayPaymentIdLean: jest.fn(),
  markSuccess: jest.fn(),
  markFailed: jest.fn(),
  finalizeRefund: jest.fn(),
}));
jest.mock('../../modules/orders/order.repo', () => ({
  findById: jest.fn(),
}));
jest.mock('../../modules/orders/orders.service', () => ({
  confirmOrder: jest.fn(),
  failOrder: jest.fn(),
  markRefunded: jest.fn(),
}));
jest.mock('../../modules/invoice/invoice.service', () => ({
  generateFromOrder: jest.fn(),
}));
jest.mock('../../modules/invoice/creditNote.service', () => ({
  generateFromOrder: jest.fn(),
}));

const { Worker } = require('bullmq');
const paymentRepo = require('../../modules/payments/payment.repo');
const orderRepo = require('../../modules/orders/order.repo');
const orderService = require('../../modules/orders/orders.service');
const invoiceService = require('../../modules/invoice/invoice.service');
const creditNoteService = require('../../modules/invoice/creditNote.service');

const loadHandler = () => {
  require('../../workers/payment-webhook.worker');
  return Worker.__handlers['payment-webhook'];
};

describe('payment-webhook worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes stripe success by marking payment + confirming order', async () => {
    const handler = loadHandler();
    paymentRepo.findByGatewayOrderIdLean.mockResolvedValue({
      _id: 'pay_1',
      orderId: 'ord_1',
      status: 'created',
    });
    orderRepo.findById.mockResolvedValue({ _id: 'ord_1' });

    await handler({
      data: {
        gateway: 'stripe',
        eventId: 'evt_1',
        payload: {
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_1', metadata: { orderId: 'ord_1' } } },
        },
      },
    });

    expect(paymentRepo.markSuccess).toHaveBeenCalledWith('pay_1', {
      transactionId: 'pi_1',
    });
    expect(orderService.confirmOrder).toHaveBeenCalledWith('ord_1');
    expect(invoiceService.generateFromOrder).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'ord_1' }),
    );
  });

  it('processes refund event and issues credit note', async () => {
    const handler = loadHandler();
    paymentRepo.findByGatewayOrderIdLean.mockResolvedValue({
      _id: 'pay_2',
      orderId: 'ord_2',
      amount: 50,
      status: 'success',
    });
    orderRepo.findById.mockResolvedValue({ _id: 'ord_2' });

    await handler({
      data: {
        gateway: 'stripe',
        eventId: 'evt_2',
        payload: {
          type: 'charge.refunded',
          data: {
            object: {
              payment_intent: 'pi_2',
              metadata: { orderId: 'ord_2' },
              amount_refunded: 5000,
            },
          },
        },
      },
    });

    expect(paymentRepo.finalizeRefund).toHaveBeenCalledWith('pay_2', true);
    expect(orderService.markRefunded).toHaveBeenCalledWith('ord_2', true);
    expect(creditNoteService.generateFromOrder).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'ord_2' }),
    );
  });

  it('handles partial stripe refund without marking full refund', async () => {
    const handler = loadHandler();
    paymentRepo.findByGatewayOrderIdLean.mockResolvedValue({
      _id: 'pay_partial',
      orderId: 'ord_partial',
      amount: 200,
      status: 'success',
    });
    orderRepo.findById.mockResolvedValue({ _id: 'ord_partial' });

    await handler({
      data: {
        gateway: 'stripe',
        eventId: 'evt_partial',
        payload: {
          type: 'charge.refunded',
          data: {
            object: {
              payment_intent: 'pi_partial',
              metadata: { orderId: 'ord_partial' },
              amount_refunded: 5000, // 50 refunded out of 200
            },
          },
        },
      },
    });

    expect(paymentRepo.finalizeRefund).toHaveBeenCalledWith('pay_partial', false);
    expect(orderService.markRefunded).toHaveBeenCalledWith('ord_partial', false);
    expect(creditNoteService.generateFromOrder).toHaveBeenCalled();
  });

  it('handles razorpay partial refund amounts', async () => {
    const handler = loadHandler();
    paymentRepo.findByGatewayPaymentIdLean.mockResolvedValue({
      _id: 'pay_rzp_refund',
      orderId: 'ord_rzp_refund',
      amount: 300,
      status: 'success',
    });
    orderRepo.findById.mockResolvedValue({ _id: 'ord_rzp_refund' });

    await handler({
      data: {
        gateway: 'razorpay',
        eventId: 'evt_rzp_refund',
        payload: {
          event: 'refund.processed',
          payload: {
            refund: {
              entity: {
                payment_id: 'rzp_payment',
                amount: 15000, // 150 refunded out of 300
              },
            },
          },
        },
      },
    });

    expect(paymentRepo.finalizeRefund).toHaveBeenCalledWith('pay_rzp_refund', false);
    expect(orderService.markRefunded).toHaveBeenCalledWith('ord_rzp_refund', false);
    expect(creditNoteService.generateFromOrder).toHaveBeenCalled();
  });

  it('handles razorpay failure by failing payment + order', async () => {
    const handler = loadHandler();
    paymentRepo.findByGatewayPaymentIdLean.mockResolvedValue({
      _id: 'pay_rzp',
      orderId: 'ord_rzp',
      status: 'created',
    });

    await handler({
      data: {
        gateway: 'razorpay',
        eventId: 'evt_rzp',
        payload: {
          event: 'payment.failed',
          payload: { payment: { entity: { id: 'rzp_pay' } } },
        },
      },
    });

    expect(paymentRepo.markFailed).toHaveBeenCalledWith('pay_rzp', {
      reason: 'gateway_failure',
    });
    expect(orderService.failOrder).toHaveBeenCalledWith('ord_rzp');
  });
});
