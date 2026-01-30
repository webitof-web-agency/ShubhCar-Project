const asyncHandler = require('../../utils/asyncHandler');
const brandService = require('./brands.service');
const { success } = require('../../utils/apiResponse');

exports.list = asyncHandler(async (req, res) => {
    const data = await brandService.list(req.query);
    return success(res, data);
});

exports.create = asyncHandler(async (req, res) => {
    const data = await brandService.create(req.body);
    return success(res, data, 'Brand created');
});

exports.get = asyncHandler(async (req, res) => {
    const data = await brandService.get(req.params.id);
    return success(res, data);
});

exports.update = asyncHandler(async (req, res) => {
    const data = await brandService.update(req.params.id, req.body);
    return success(res, data, 'Brand updated');
});

exports.remove = asyncHandler(async (req, res) => {
    await brandService.delete(req.params.id);
    return success(res, null, 'Brand deleted');
});
