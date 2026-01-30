const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./wishlist.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list(req.user.id);
  return success(res, data, 'Wishlist fetched');
});

exports.add = asyncHandler(async (req, res) => {
  const data = await service.add(req.user.id, req.body.productId);
  return success(res, data, 'Added to wishlist', 201);
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.user.id, req.params.productId);
  return success(res, null, 'Removed from wishlist');
});
