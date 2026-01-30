const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./userActivityLogs.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list(req.query);
  return success(res, data, 'User activity logs fetched');
});
