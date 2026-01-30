const asyncHandler = require('../../utils/asyncHandler');
const authService = require('./auth.service');
const { success } = require('../../utils/apiResponse');

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return success(res, result, 'Registration successful');
});

exports.login = async (req, res) => {
  console.log('LOGIN CONTROLLER HIT');
  try {
    const result = await authService.login(req.body);
    return success(res, result, 'Login successful');
  } catch (error) {
    console.error('Login error stack:', error.stack);
    
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal Server Error',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
};

exports.sendPhoneOtp = asyncHandler(async (req, res) => {
  await authService.sendPhoneOtp(req.body.phone);
  return success(res, null, 'OTP sent successfully');
});

exports.verifyPhoneOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyPhoneOtp(req.body, {
    ip: req.ip,
    device: req.headers['user-agent'],
  });
  return success(res, result, 'OTP verified successfully');
});

exports.sendEmailOtp = asyncHandler(async (req, res) => {
  await authService.sendEmailOtp(req.body.email);
  return success(res, null, 'OTP sent successfully');
});

exports.verifyEmailOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmailOtp(req.body, {
    ip: req.ip,
    device: req.headers['user-agent'],
  });
  return success(res, result, 'OTP verified successfully');
});

exports.googleAuth = asyncHandler(async (req, res) => {
  const result = await authService.googleAuth(req.body.idToken, {
    ip: req.ip,
    device: req.headers['user-agent'],
  });
  return success(res, result, 'Login successful');
});

exports.refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body);
  return success(res, result, 'Token refreshed');
});
exports.logout = asyncHandler(async (req, res) => {
  await authService.logout({

     userId: req.user.id,
    refreshToken: req.body.refreshToken,
  });
  return success(res, null, 'Logout successful');
});

exports.logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.userId);
  return success(res, null, 'All sessions logged out');
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  return success(res, null, 'If account exists, OTP has been sent');
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  return success(res, null, 'Password reset successful');
});
