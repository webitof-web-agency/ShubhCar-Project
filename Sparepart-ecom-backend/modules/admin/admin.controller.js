const asyncHandler = require('../../utils/asyncHandler');
const adminService = require('./admin.service');
const { success } = require('../../utils/apiResponse');

exports.listPendingWholesale = asyncHandler(async (req, res) => {
  const data = await adminService.listPendingWholesale();
  return success(res, data);
});

exports.reviewWholesaleUser = asyncHandler(async (req, res) => {
  const data = await adminService.reviewWholesaleUser(
    req.user,
    req.params.userId,
    req.body,
  );

  return success(res, data, 'Wholesale user reviewed');
});
