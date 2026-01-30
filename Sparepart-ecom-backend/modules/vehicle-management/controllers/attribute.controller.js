const asyncHandler = require('../../../utils/asyncHandler');
const { success } = require('../../../utils/apiResponse');
const service = require('../services/attribute.service');
const valuesService = require('../services/attributeValue.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list(req.query);
  return success(res, data);
});

exports.listWithValues = asyncHandler(async (req, res) => {
  const data = await service.list(req.query);
  const attributeIds = data.items.map((item) => item._id);
  const values = await valuesService.listByAttributes(attributeIds);
  const valueMap = new Map();
  values.forEach((value) => {
    const key = String(value.attributeId);
    const list = valueMap.get(key) || [];
    list.push(value);
    valueMap.set(key, list);
  });

  data.items = data.items.map((item) => ({
    ...item,
    values: valueMap.get(String(item._id)) || [],
  }));

  return success(res, data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body);
  return success(res, data, 'Vehicle attribute created');
});

exports.get = asyncHandler(async (req, res) => {
  const data = await service.get(req.params.id);
  return success(res, data);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  return success(res, data, 'Vehicle attribute updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.params.id);
  return success(res, data, 'Vehicle attribute deleted');
});
