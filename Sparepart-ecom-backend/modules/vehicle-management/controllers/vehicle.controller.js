const asyncHandler = require('../../../utils/asyncHandler');
const { success } = require('../../../utils/apiResponse');
const service = require('../services/vehicle.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list(req.query);
  return success(res, data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body);
  return success(res, data, 'Vehicle created');
});

exports.get = asyncHandler(async (req, res) => {
  const data = await service.get(req.params.id);
  return success(res, data);
});

exports.detail = asyncHandler(async (req, res) => {
  const data = await service.detail(req.params.id);
  return success(res, data);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  return success(res, data, 'Vehicle updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.params.id);
  return success(res, data, 'Vehicle deleted');
});

exports.availableYears = asyncHandler(async (req, res) => {
  const data = await service.listAvailableYears(req.query);
  return success(res, data);
});

exports.availableAttributes = asyncHandler(async (req, res) => {
  const data = await service.listAvailableAttributes(req.query);
  return success(res, data);
});

exports.export = asyncHandler(async (req, res) => {
  const data = await service.exportVehicles(req.query.format);
  res.setHeader('Content-Type', data.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
  return res.send(data.buffer);
});
