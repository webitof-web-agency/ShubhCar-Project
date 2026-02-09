const asyncHandler = require('../../utils/asyncHandler');
const userService = require('./users.service');
const tokenBlacklist = require('../../services/tokenBlacklist.service');

/**
 * Register new user
 * Public
 */
exports.register = asyncHandler(async (req, res) => {
  const user = await userService.register(req.body);
  return res.ok(user, 'User registered', 201);
});

/**
 * Get own profile
 * Authenticated
 */
exports.getMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.getMyProfile(req.user.id);
  return res.ok(user);
});

/**
 * Update own profile
 * Authenticated
 */
exports.updateMyProfile = asyncHandler(async (req, res) => {
  const updated = await userService.updateMyProfile(req.user.id, req.body);
  return res.ok(updated, 'Profile updated');
});

/**
 * Logout
 * Authenticated
 */
exports.logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await tokenBlacklist.addToBlacklist(token);
  }
  return res.ok(null, 'Logged out successfully');
});

exports.adminGetStatusCounts = asyncHandler(async (req, res) => {
  const data = await userService.adminGetStatusCounts(req.user);
  return res.ok(data, 'User stats fetched');
});

exports.adminList = asyncHandler(async (req, res) => {
  const data = await userService.adminList(req.user, req.query);
  return res.ok(data, 'Users fetched');
});
exports.adminCreate = asyncHandler(async (req, res) => {
  const data = await userService.adminCreate(req.user, req.body);
  return res.ok(data, 'User created', 201);
});
exports.adminGet = asyncHandler(async (req, res) => {
  const data = await userService.adminGet(req.user, req.params.userId);
  return res.ok(data, 'User fetched');
});
exports.adminUpdate = asyncHandler(async (req, res) => {
  const data = await userService.adminUpdate(req.user, req.params.userId, req.body);
  return res.ok(data, 'User updated');
});
exports.adminUpdateStatus = asyncHandler(async (req, res) => {
  const data = await userService.adminUpdateStatus(req.user, req.params.userId, req.body);
  return res.ok(data, 'User status updated');
});
exports.adminApproveWholesale = asyncHandler(async (req, res) => {
  const data = await userService.adminApproveWholesale(req.user, req.params.userId);
  return res.ok(data, 'Wholesale user approved');
});
exports.adminLogoutAll = asyncHandler(async (req, res) => {
  const data = await userService.adminLogoutAll(req.user, req.params.userId);
  return res.ok(data, 'User logged out from all sessions');
});
exports.adminForcePasswordReset = asyncHandler(async (req, res) => {
  const newPassword = req.body.newPassword || req.body.password;
  if (!newPassword) {
    return res.badRequest('New password is required');
  }

  const data = await userService.adminForcePasswordReset(
    req.user,
    req.params.userId,
    newPassword,
  );
  return res.ok(data, 'Password reset successfully');
});

exports.adminDelete = asyncHandler(async (req, res) => {
  const data = await userService.adminDelete(req.user, req.params.id);
  return res.ok(data, 'User deleted successfully');
});

exports.adminExportCustomers = asyncHandler(async (req, res) => {
  const data = await userService.adminExportCustomers(req.user, req.query);
  res.setHeader('Content-Type', data.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
  return res.send(data.buffer);
});

exports.adminImportCustomers = asyncHandler(async (req, res) => {
  const data = await userService.adminImportCustomers(req.user, req.file);
  return res.ok(data, 'Customers import completed');
});
