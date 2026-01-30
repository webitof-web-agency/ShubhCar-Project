const asyncHandler = require('../../utils/asyncHandler');
const orderService = require('./orders.service');
const adminService = require('./orders.admin.service');
const { success } = require('../../utils/apiResponse');
const audit = require('../audit/audit.service');

exports.placeOrder = asyncHandler(async (req, res) => {
  const data = await orderService.placeOrder({
    user: req.user,
    sessionId: req.headers['x-session-id'],
    payload: req.body,
    context: {
      requestId: req.id,
      userId: req.user?.id,
      route: req.originalUrl,
      method: req.method,
    },
  });

  return success(res, data, 'Order placed');
});
exports.cancelMyOrder = asyncHandler(async (req, res) => {
  const data = await orderService.cancelByUser({
    user: req.user,
    orderId: req.params.orderId,
    payload: req.body,
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'order_cancel',
    target: { orderId: req.params.orderId },
  });
  return success(res, data, 'Order cancelled');
});

exports.myOrders = asyncHandler(async (req, res) => {
  const data = await orderService.getUserOrders(req.user.id, req.query);
  return success(res, data, 'Orders fetched');
});

exports.getOrder = asyncHandler(async (req, res) => {
  const data = await orderService.getOrderDetail(req.user, req.params.orderId);
  return success(res, data, 'Order detail fetched');
});

exports.adminUpdateStatus = asyncHandler(async (req, res) => {
  const data = await orderService.updateByAdmin({
    admin: req.user,
    orderId: req.params.orderId,
    payload: req.body,
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'order_status_update',
    target: { orderId: req.params.orderId },
    meta: { payload: req.body },
  });
  return success(res, data, 'Order status updated');
});

exports.adminUpdatePaymentStatus = asyncHandler(async (req, res) => {
  const data = await orderService.updatePaymentByAdmin({
    admin: req.user,
    orderId: req.params.orderId,
    payload: req.body,
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'order_payment_status_update',
    target: { orderId: req.params.orderId },
    meta: { payload: req.body },
  });
  return success(
    res,
    {
      orderId: req.params.orderId,
      paymentStatus: data?.paymentStatus,
      ...data?.paymentSummary,
    },
    'Payment status updated',
  );
});

exports.adminFlagFraud = asyncHandler(async (req, res) => {
  const data = await orderService.setFraudFlag({
    admin: req.user,
    orderId: req.params.orderId,
    payload: req.body,
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'order_fraud_flag',
    target: { orderId: req.params.orderId },
    meta: req.body,
  });
  return success(res, data, 'Order fraud flag updated');
});

exports.adminList = asyncHandler(async (req, res) => {
  const data = await adminService.adminList(req.query);
  return success(res, data, 'Orders fetched');
});

exports.adminGetOrderHistory = asyncHandler(async (req, res) => {
  const data = await adminService.adminGetOrderHistory(req.params.orderId);
  return success(res, data, 'Order history fetched');
});

exports.adminGetOrder = asyncHandler(async (req, res) => {
  const data = await adminService.adminGetOrder(req.params.orderId);
  return success(res, data, 'Order fetched');
});

// New methods for order notes
exports.adminGetOrderNotes = asyncHandler(async (req, res) => {
  const data = await adminService.adminGetOrderNotes(req.params.orderId);
  return success(res, data, 'Order notes fetched');
});

exports.adminAddOrderNote = asyncHandler(async (req, res) => {
  const data = await adminService.adminAddOrderNote({
    admin: req.user,
    orderId: req.params.orderId,
    payload: req.body,
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'order_note_add',
    target: { orderId: req.params.orderId },
    meta: req.body,
  });
  return success(res, data, 'Note added');
});

exports.adminCreateOrder = asyncHandler(async (req, res) => {
  const data = await orderService.adminCreateOrder({
    admin: req.user,
    payload: req.body,
    context: {
      requestId: req.id,
      userId: req.user?.id,
      route: req.originalUrl,
      method: req.method,
    },
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'order_manual_create',
    target: { userId: req.body.userId, orderId: data?._id },
    meta: { itemCount: req.body?.items?.length || 0 },
  });
  return success(res, data, 'Order created');
});

// New method for status counts
exports.adminGetStatusCounts = asyncHandler(async (req, res) => {
  const data = await adminService.adminGetStatusCounts();
  return success(res, data, 'Status counts fetched');
});
