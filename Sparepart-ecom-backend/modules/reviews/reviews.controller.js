const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./reviews.service');

exports.listByProduct = asyncHandler(async (req, res) => {
  const data = await service.listByProduct(req.params.productId);
  return success(res, data, 'Reviews fetched');
});

exports.create = asyncHandler(async (req, res) => {
  const data = await service.create({ user: req.user, payload: req.body });
  return success(res, data, 'Review created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await service.update({
    user: req.user,
    reviewId: req.params.id,
    payload: req.body,
  });
  return success(res, data, 'Review updated');
});
exports.getAggregate = asyncHandler(async (req, res) => {
  const data = await service.getAggregate(req.params.productId);
  return success(res, data, 'Review aggregate fetched');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove({
    user: req.user,
    reviewId: req.params.id,
  });
  return success(res, data, 'Review deleted');
});
exports.adminList = asyncHandler(async (req, res) => {
  const data = await service.adminList(req.query);
  return success(res, data, 'Reviews fetched');
});

exports.adminGet = asyncHandler(async (req, res) => {
  const data = await service.adminGet(req.params.reviewId);
  return success(res, data, 'Review fetched');
});
exports.adminGetOrder = asyncHandler(async (req, res) => {
  const data = await orderService.adminGetOrder(req.params.orderId);
  return success(res, data, 'Order fetched');
});
exports.adminGetOrderHistory = asyncHandler(async (req, res) => {
  const data = await orderService.adminGetOrderHistory(req.params.orderId);
  return success(res, data, 'Order history fetched');
});
