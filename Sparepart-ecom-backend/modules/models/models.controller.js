const asyncHandler = require('../../utils/asyncHandler');
const modelService = require('./models.service');
const { success } = require('../../utils/apiResponse');

exports.list = asyncHandler(async (req, res) => {
    const data = await modelService.list(req.query);
    return success(res, data);
});

exports.create = asyncHandler(async (req, res) => {
    const data = await modelService.create(req.body);
    return success(res, data, 'Model created');
});

exports.get = asyncHandler(async (req, res) => {
    const data = await modelService.get(req.params.id);
    return success(res, data);
});

exports.update = asyncHandler(async (req, res) => {
    const data = await modelService.update(req.params.id, req.body);
    return success(res, data, 'Model updated');
});

exports.remove = asyncHandler(async (req, res) => {
    await modelService.delete(req.params.id);
    return success(res, null, 'Model deleted');
});
