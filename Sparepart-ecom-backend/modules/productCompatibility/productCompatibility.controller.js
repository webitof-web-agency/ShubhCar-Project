const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./productCompatibility.service');

exports.getByProduct = asyncHandler(async (req, res) => {
  const data = await service.getByProduct(req.params.productId);
  return success(res, data);
});

exports.upsert = asyncHandler(async (req, res) => {
  const data = await service.upsert(req.params.productId, req.body);
  return success(res, data, 'Compatibility updated');
});
