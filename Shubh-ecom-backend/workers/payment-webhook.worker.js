const { queuesEnabled } = require('../config/queue');

if (!queuesEnabled) {
  // eslint-disable-next-line no-console
  console.warn('Worker disabled: REDIS_URL not set');
  module.exports = { worker: null, disabled: true };
} else {
  const { Worker } = require('bullmq');
  const { connection } = require('../config/queue');
  const logger = require('../config/logger');
  const { logWorkerFailure } = require('../utils/workerLogger');

  const paymentRepo = require('../modules/payments/payment.repo');
  const orderRepo = require('../modules/orders/order.repo');
  const orderService = require('../modules/orders/orders.service');
  const invoiceService = require('../modules/invoice/invoice.service');
  const creditNoteService = require('../modules/invoice/creditNote.service');

  const { PAYMENT_RECORD_STATUS } = require('../constants/paymentStatus');

  const handleStripe = async (payload) => {
    const type = payload?.type;
    const object = payload?.data?.object;
    const orderId = object?.metadata?.orderId;
    if (!orderId) return;

    const payment = await paymentRepo.findByGatewayOrderIdLean(orderId);
    if (!payment) return;

    if (type === 'payment_intent.succeeded') {
      const updatedPayment = await paymentRepo.markSuccess(payment._id, {
        transactionId: object?.id,
      });
      await orderRepo.updateById(payment.orderId, {
        paymentSnapshot: {
          paymentId: payment._id,
          gateway: updatedPayment.paymentGateway,
          gatewayOrderId: updatedPayment.gatewayOrderId || null,
          transactionId: updatedPayment.transactionId || object?.id || null,
          status: PAYMENT_RECORD_STATUS.SUCCESS,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency || 'INR',
          createdAt: updatedPayment.createdAt || new Date(),
          updatedAt: new Date(),
        },
      });
      const order = await orderRepo.findById(orderId);
      if (order) {
        await orderService.confirmOrder(orderId);
        await invoiceService.generateFromOrder(order);
      }
      return;
    }

    if (type === 'charge.refunded') {
      const refundedAmount =
        typeof object?.amount_refunded === 'number'
          ? object.amount_refunded / 100
          : 0;
      const isFullRefund = refundedAmount >= (payment.amount || 0);
      const order = await orderRepo.findById(orderId);
      const updatedPayment = await paymentRepo.finalizeRefund(payment._id, isFullRefund);
      await orderRepo.updateById(payment.orderId, {
        paymentSnapshot: {
          paymentId: payment._id,
          gateway: updatedPayment.paymentGateway,
          gatewayOrderId: updatedPayment.gatewayOrderId || null,
          transactionId: updatedPayment.transactionId || object?.id || null,
          status: PAYMENT_RECORD_STATUS.REFUNDED,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency || 'INR',
          createdAt: updatedPayment.createdAt || new Date(),
          updatedAt: new Date(),
        },
      });
      if (order) {
        await orderService.markRefunded(orderId, isFullRefund);
        await creditNoteService.generateFromOrder(order);
      }
    }
  };

  const handleRazorpay = async (payload) => {
    const event = payload?.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payload?.payment?.entity;
      const paymentId = paymentEntity?.id;
      const gatewayOrderId = paymentEntity?.order_id;
      let payment = null;
      if (paymentId) {
        payment = await paymentRepo.findByGatewayPaymentIdLean(paymentId);
      }
      if (!payment && gatewayOrderId) {
        payment = await paymentRepo.findByGatewayOrderIdLean(gatewayOrderId);
      }
      if (!payment) return;
      if (payment.status === PAYMENT_RECORD_STATUS.SUCCESS) return;
      const updatedPayment = await paymentRepo.markSuccess(payment._id, {
        transactionId: paymentId || payment.transactionId,
        gatewayResponse: paymentEntity,
      });
      await orderRepo.updateById(payment.orderId, {
        paymentSnapshot: {
          paymentId: payment._id,
          gateway: updatedPayment.paymentGateway,
          gatewayOrderId: updatedPayment.gatewayOrderId || null,
          transactionId: updatedPayment.transactionId || paymentId || null,
          status: PAYMENT_RECORD_STATUS.SUCCESS,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency || 'INR',
          createdAt: updatedPayment.createdAt || new Date(),
          updatedAt: new Date(),
        },
      });
      const order = await orderRepo.findById(payment.orderId);
      if (order) {
        await orderService.confirmOrder(payment.orderId);
        await invoiceService.generateFromOrder(order);
      }
      return;
    }

    if (event === 'refund.processed') {
      const paymentId = payload?.payload?.refund?.entity?.payment_id;
      const refundAmount =
        typeof payload?.payload?.refund?.entity?.amount === 'number'
          ? payload.payload.refund.entity.amount / 100
          : 0;
      const payment = await paymentRepo.findByGatewayPaymentIdLean(paymentId);
      if (!payment) return;
      const isFullRefund = refundAmount >= (payment.amount || 0);
      const order = await orderRepo.findById(payment.orderId);
      const updatedPayment = await paymentRepo.finalizeRefund(payment._id, isFullRefund);
      await orderRepo.updateById(payment.orderId, {
        paymentSnapshot: {
          paymentId: payment._id,
          gateway: updatedPayment.paymentGateway,
          gatewayOrderId: updatedPayment.gatewayOrderId || null,
          transactionId: updatedPayment.transactionId || paymentId || null,
          status: PAYMENT_RECORD_STATUS.REFUNDED,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency || 'INR',
          createdAt: updatedPayment.createdAt || new Date(),
          updatedAt: new Date(),
        },
      });
      if (order) {
        await orderService.markRefunded(payment.orderId, isFullRefund);
        await creditNoteService.generateFromOrder(order);
      }
      return;
    }

    if (event === 'payment.failed') {
      const paymentId = payload?.payload?.payment?.entity?.id;
      const gatewayOrderId = payload?.payload?.payment?.entity?.order_id;
      let payment = null;
      if (paymentId) {
        payment = await paymentRepo.findByGatewayPaymentIdLean(paymentId);
      }
      if (!payment && gatewayOrderId) {
        payment = await paymentRepo.findByGatewayOrderIdLean(gatewayOrderId);
      }
      if (!payment) return;
      const updatedPayment = await paymentRepo.markFailed(payment._id, { reason: 'gateway_failure' });
      await orderRepo.updateById(payment.orderId, {
        paymentSnapshot: {
          paymentId: payment._id,
          gateway: updatedPayment.paymentGateway,
          gatewayOrderId: updatedPayment.gatewayOrderId || null,
          transactionId: updatedPayment.transactionId || paymentId || null,
          status: PAYMENT_RECORD_STATUS.FAILED,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency || 'INR',
          createdAt: updatedPayment.createdAt || new Date(),
          updatedAt: new Date(),
        },
      });
      await orderService.failOrder(payment.orderId);
    }
  };

  let worker = null;

  try {
    worker = new Worker(
      'payment-webhook',
      async (job) => {
        try {
          const { gateway, eventId } = job.data;
          logger.info('Processing payment webhook', { gateway, eventId });

          if (gateway === 'stripe') {
            await handleStripe(job.data.payload);
          } else if (gateway === 'razorpay') {
            await handleRazorpay(job.data.payload);
          } else {
            logger.warn('Unknown gateway webhook', { gateway });
            return;
          }
        } catch (err) {
          logWorkerFailure('paymentWebhook', job, err);
          throw err;
        }
      },
      { connection },
    );

    worker.on('failed', (job, err) => {
      logWorkerFailure('paymentWebhook', job, err);
    });
  } catch (err) {
    logger.error('Payment webhook worker initialization failed', {
      error: err.message,
    });
  }

  module.exports = { worker, disabled: false };
}
