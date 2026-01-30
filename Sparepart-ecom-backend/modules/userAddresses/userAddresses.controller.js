const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./userAddresses.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list(req.user.id);
  return success(res, data, 'Addresses fetched');
});

exports.adminListByUser = asyncHandler(async (req, res) => {
  const data = await service.adminListByUser(req.params.userId);
  return success(res, data, 'Addresses fetched');
});

exports.get = asyncHandler(async (req, res) => {
  const data = await service.get(req.params.id, req.user.id);
  return success(res, data, 'Address fetched');
});

exports.create = asyncHandler(async (req, res) => {
  const data = await service.create(req.user.id, req.body);
  return success(res, data, 'Address created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.user.id, req.body);
  return success(res, data, 'Address updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.params.id, req.user.id);
  return success(res, data, 'Address deleted');
});
