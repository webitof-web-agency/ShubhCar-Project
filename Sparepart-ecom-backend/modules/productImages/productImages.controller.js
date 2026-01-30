const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./productImages.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list(req.query);
  return success(res, data, 'Product images fetched');
});

exports.get = asyncHandler(async (req, res) => {
  const data = await service.get(req.params.id);
  return success(res, data, 'Product image fetched');
});

exports.create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body);
  return success(res, data, 'Product image created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  return success(res, data, 'Product image updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.params.id);
  return success(res, data, 'Product image deleted');
});
