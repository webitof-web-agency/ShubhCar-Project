const asyncHandler = require('../../utils/asyncHandler');
const paymentService = require('./payments.service');
const refundService = require('./refund.service');
const audit = require('../audit/audit.service');
const { success } = require('../../utils/apiResponse');
const { getPaymentSettings } = require('../../utils/paymentSettings');

/**
 * Initiate payment
 * Auth + role + validation already enforced
 */
exports.initiate = asyncHandler(async (req, res) => {
  const result = await paymentService.initiatePayment({
    ...req.body,
    context: {
      requestId: req.id,
      route: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
    },
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'payment_initiate',
    target: { orderId: req.body.orderId, gateway: req.body.gateway },
  });
  return res.ok(result, 'Payment initiated');
});

/**
 * Retry payment
 * Auth + role + validation already enforced
 */
exports.retry = asyncHandler(async (req, res) => {
  const result = await paymentService.retryPayment({
    ...req.body,
    context: {
      requestId: req.id,
      route: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
    },
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'payment_retry',
    target: { orderId: req.body.orderId, gateway: req.body.gateway },
  });
  return res.ok(result, 'Payment retry enqueued');
});

exports.getStatus = asyncHandler(async (req, res) => {
  const data = await paymentService.getStatus(
    req.params.paymentId,
    req.user.id,
  );
  return success(res, data, 'Payment status fetched');
});

exports.confirmPayment = asyncHandler(async (req, res) => {
  const data = await paymentService.confirmPayment(
    req.params.paymentId,
    req.user,
  );
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'payment_confirm',
    target: { paymentId: req.params.paymentId },
  });
  return success(res, data, 'Payment status confirmed');
});

exports.adminApproveRefund = asyncHandler(async (req, res) => {
  const data = await refundService.requestRefund({
    paymentId: req.params.paymentId,
    amount: req.body.amount,
    reason: req.body.reason,
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'refund_approve',
    target: { paymentId: req.params.paymentId },
    meta: { amount: req.body.amount, reason: req.body.reason },
  });
  return success(res, data, 'Refund initiated');
});

exports.adminList = asyncHandler(async (req, res) => {
  const data = await paymentService.adminList(req.user, req.query);
  return success(res, data, 'Payments fetched');
});

exports.getMethods = asyncHandler(async (_req, res) => {
  const settings = await getPaymentSettings();
  return success(
    res,
    {
      methods: [
        { code: 'cod', enabled: Boolean(settings.codEnabled) },
        { code: 'razorpay', enabled: Boolean(settings.razorpayEnabled) },
      ],
      razorpay: {
        keyId: settings.razorpayKeyId || null,
      },
    },
    'Payment methods fetched',
  );
});
