const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./return.service');
const audit = require('../audit/audit.service');

exports.create = asyncHandler(async (req, res) => {
  const data = await service.requestReturn({ user: req.user, payload: req.body });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'return_request',
    target: { returnId: data._id, orderId: data.orderId },
  });
  return success(res, data, 'Return request created', 201);
});

exports.adminDecision = asyncHandler(async (req, res) => {
  const data = await service.adminDecision({
    admin: req.user,
    id: req.params.id,
    payload: req.body,
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'return_admin_decision',
    target: { returnId: req.params.id },
    meta: req.body,
  });
  return success(res, data, 'Return updated');
});

exports.vendorConfirm = asyncHandler(async (req, res) => {
  const data = await service.vendorConfirm({
    vendorUser: req.user,
    id: req.params.id,
    payload: req.body,
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'return_vendor_confirm',
    target: { returnId: req.params.id },
    meta: req.body,
  });
  return success(res, data, 'Return vendor confirmation recorded');
});

exports.complete = asyncHandler(async (req, res) => {
  const data = await service.complete({
    admin: req.user,
    id: req.params.id,
    payload: req.body,
    context: {
      requestId: req.id,
      route: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
    },
  });
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'return_complete',
    target: { returnId: req.params.id },
    meta: req.body,
  });
  return success(res, data, 'Return completed');
});

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list(req.query);
  return success(res, data, 'Returns fetched');
});

exports.get = asyncHandler(async (req, res) => {
  const data = await service.get(req.params.id, req.user);
  return success(res, data, 'Return fetched');
});
