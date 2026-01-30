const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./categoryAttribute.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await service.listByCategory(req.params.categoryId);
  return success(res, data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body);
  return success(res, data, 'Attribute created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.attributeId, req.body);
  return success(res, data, 'Attribute updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.params.attributeId);
  return success(res, data, 'Attribute deleted');
});
