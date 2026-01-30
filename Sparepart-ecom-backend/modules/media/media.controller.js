const asyncHandler = require('../../utils/asyncHandler');
const mediaService = require('./media.service');
const { success } = require('../../utils/apiResponse');

exports.presign = asyncHandler(async (req, res) => {
  const data = await mediaService.presign(req.body, req.user);
  return success(res, data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = await mediaService.create(req.body, req.user);
  return success(res, data, 'Media created', 201);
});

exports.list = asyncHandler(async (req, res) => {
  const data = await mediaService.list(req.query);
  return success(res, data);
});

exports.get = asyncHandler(async (req, res) => {
  const data = await mediaService.get(req.params.id);
  return success(res, data);
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await mediaService.remove(req.params.id, req.user);
  return success(res, data);
});

exports.upload = asyncHandler(async (req, res) => {
  const data = await mediaService.createFromUpload(
    req.files || [],
    req.user,
    req.body,
  );
  return success(res, data, 'Media uploaded', 201);
});
