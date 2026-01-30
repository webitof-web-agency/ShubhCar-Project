const asyncHandler = require('../../utils/asyncHandler');
const { success, error: errorResp } = require('../../utils/apiResponse');
const service = require('./coupons.service');
const { previewSchema, createSchema, updateSchema } = require('./coupon.validator');
const audit = require('../audit/audit.service');
const ROLES = require('../../constants/roles');

exports.preview = asyncHandler(async (req, res) => {
  const { error: err, value } = previewSchema.validate(req.body);
  if (err) return errorResp(err.details[0].message, 400);

  if (value.userId && req.user?.role !== ROLES.ADMIN) {
    return errorResp('Not allowed to preview coupon for another user', 403);
  }

  const data = await service.preview({
    userId: value.userId || req.user?.id,
    code: value.code,
    orderSubtotal: value.orderSubtotal,
  });
  return success(res, data, 'Coupon preview');
});

exports.create = asyncHandler(async (req, res) => {
  const { error: err, value } = createSchema.validate(req.body);
  if (err) return errorResp(err.details[0].message, 400);
  const data = await service.create(value);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'coupon_create',
    target: { id: data._id },
  });
  return success(res, data, 'Coupon created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const { error: err, value } = updateSchema.validate(req.body);
  if (err) return errorResp(err.details[0].message, 400);
  const data = await service.update(req.params.id, value);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'coupon_update',
    target: { id: req.params.id },
  });
  return success(res, data, 'Coupon updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.params.id);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'coupon_delete',
    target: { id: req.params.id },
  });
  return success(res, data, 'Coupon deleted');
});

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list();
  return success(res, data, 'Coupons fetched');
});

exports.listPublic = asyncHandler(async (req, res) => {
  const data = await service.listPublic();
  return success(res, data, 'Coupons fetched');
});

exports.get = asyncHandler(async (req, res) => {
  const data = await service.get(req.params.id);
  if (!data) return errorResp('Coupon not found', 404);
  return success(res, data, 'Coupon fetched');
});

exports.listUsage = asyncHandler(async (req, res) => {
  const data = await service.listUsage();
  return success(res, data, 'Coupon usage fetched');
});
