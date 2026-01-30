const express = require('express');
const controller = require('./auth.controller');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { authLimiter } = require('../../middlewares/rateLimiter.middleware');

const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  googleAuthSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
} = require('./auth.validator');

const router = express.Router();

/* =========================
   PUBLIC + RATE LIMITED
========================= */

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new customer account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *             required: [name, email, password]
 *     responses:
 *       201:
 *         description: Account created with session tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthTokens'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid registration data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Register
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  controller.register,
);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate a user with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: Login success with tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthTokens'
 *                 message:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Login
// Login
router.post('/login', controller.login);
// router.post('/login', authLimiter, validate(loginSchema), controller.login);

/**
 * @openapi
 * /api/v1/auth/phone/send-otp:
 *   post:
 *     summary: Send a one-time password to a phone number
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *             required: [phone]
 *     responses:
 *       200:
 *         description: OTP sent if the phone number is valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 *       400:
 *         description: Invalid phone number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Phone OTP - send
router.post(
  '/phone/send-otp',
  authLimiter,
  validate(sendPhoneOtpSchema),
  controller.sendPhoneOtp,
);

/**
 * @openapi
 * /api/v1/auth/phone/verify-otp:
 *   post:
 *     summary: Verify phone OTP and issue session tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *             required: [phone, otp]
 *     responses:
 *       200:
 *         description: OTP verified and session issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthTokens'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Phone OTP - verify + login/register
router.post(
  '/phone/verify-otp',
  authLimiter,
  validate(verifyPhoneOtpSchema),
  controller.verifyPhoneOtp,
);

/**
 * @openapi
 * /api/v1/auth/email/send-otp:
 *   post:
 *     summary: Send an email OTP for verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *             required: [email]
 *     responses:
 *       200:
 *         description: OTP sent to email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 *       400:
 *         description: Invalid email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Email OTP - send
router.post(
  '/email/send-otp',
  authLimiter,
  validate(sendEmailOtpSchema),
  controller.sendEmailOtp,
);

/**
 * @openapi
 * /api/v1/auth/email/verify-otp:
 *   post:
 *     summary: Verify email OTP and issue session tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *             required: [email, otp]
 *     responses:
 *       200:
 *         description: OTP verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthTokens'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Email OTP - verify + login/register
router.post(
  '/email/verify-otp',
  authLimiter,
  validate(verifyEmailOtpSchema),
  controller.verifyEmailOtp,
);

/**
 * @openapi
 * /api/v1/auth/google:
 *   post:
 *     summary: Login or register using Google OAuth token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *             required: [idToken]
 *     responses:
 *       200:
 *         description: Google token exchanged for session tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthTokens'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid Google token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Google OAuth login/register
router.post(
  '/google',
  authLimiter,
  validate(googleAuthSchema),
  controller.googleAuth,
);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using a valid refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *             required: [refreshToken]
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthTokens'
 *                 message:
 *                   type: string
 *       401:
 *         description: Invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Refresh (VERY sensitive)
router.post(
  '/refresh',
  authLimiter,
  validate(refreshSchema),
  controller.refresh,
);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Send a password reset link or OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *             required: [email]
 *     responses:
 *       200:
 *         description: Reset instructions sent if account exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Forgot password
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword,
);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset account password using a valid token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *             required: [token, newPassword]
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Reset password
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  controller.resetPassword,
);

/* =========================
   PROTECTED
========================= */

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout the current session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Logout current session
router.post('/logout', auth(), controller.logout);

/**
 * @openapi
 * /api/v1/auth/all-logouts:
 *   post:
 *     summary: Logout from all active sessions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Logout all sessions
router.post('/all-logouts', auth(), controller.logoutAll);

module.exports = router;
