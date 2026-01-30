const express = require('express');

/* =======================
   MIDDLEWARES
======================= */
const auth = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const validate = require('../../middlewares/validate.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./users.controller');
const { registerUserSchema, profileUpdateSchema, adminCreateSchema } = require('./user.validator');
const ROLES = require('../../constants/roles');
const multer = require('multer');
const router = express.Router();

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    if (name.endsWith('.csv') || name.endsWith('.xlsx')) {
      return cb(null, true);
    }
    return cb(new Error('Only CSV or XLSX files are allowed'));
  },
});

/* =======================
   PUBLIC ROUTES
======================= */

/**
 * @openapi
 * /api/v1/users/register:
 *   post:
 *     summary: Register a new user (Alternate)
 *     tags: [Users]
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
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post('/register', validate(registerUserSchema), controller.register);

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                 success:
 *                   type: boolean
 */
router.get('/me', auth(), controller.getMyProfile);

/**
 * @openapi
 * /api/v1/users/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.put(
  '/me',
  auth(),
  validate(profileUpdateSchema),
  controller.updateMyProfile,
);

router.post('/logout', auth(), controller.logout);

// Admin CRUD
//router.post('/admin', adminLimiter, controller.create);
//router.put('/admin/:id', adminLimiter, validate('id'), controller.update);
router.delete('/admin/:id', adminLimiter, auth(), authorize([ROLES.ADMIN]), controller.adminDelete);

/* =======================
   ADMIN CMS ROUTES
======================= */

router.get('/admin/counts', adminLimiter, auth(), authorize([ROLES.ADMIN]), controller.adminGetStatusCounts);

router.get(
  '/admin/customers/export',
  adminLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  controller.adminExportCustomers,
);

router.post(
  '/admin/customers/import',
  adminLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  importUpload.single('file'),
  controller.adminImportCustomers,
);

/**
 * @openapi
 * /api/v1/users/admin:
 *   get:
 *     summary: List all users (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.get(
  '/admin',
  adminLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  controller.adminList,
);
router.post(
  '/admin',
  adminLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  validate(adminCreateSchema),
  controller.adminCreate,
);

/**
 * @openapi
 * /api/v1/users/admin/{userId}:
 *   get:
 *     summary: Get user details (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.get(
  '/admin/:userId',
  adminLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  controller.adminGet,
);

/**
 * @openapi
 * /api/v1/users/admin/{userId}/status:
 *   patch:
 *     summary: Update user status (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, banned]
 *             required: [status]
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.patch(
  '/admin/:userId/status',
  adminLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  controller.adminUpdateStatus,
);

//Edit user profile

router.patch(
  '/admin/:userId/',
  adminLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  controller.adminUpdate,
);

/**
 * @openapi
 * /api/v1/users/admin/{userId}/approve-wholesale:
 *   post:
 *     summary: Approve wholesale status for a user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wholesale approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post(
  '/admin/:userId/approve-wholesale',
  adminLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  controller.adminApproveWholesale,
);

/**
 * @openapi
 * /api/v1/users/admin/{userId}/logout-all:
 *   post:
 *     summary: Force logout user from all devices (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User logged out
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post(
  '/admin/:userId/logout-all',
  adminLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  controller.adminLogoutAll,
);

/**
 * @openapi
 * /api/v1/users/admin/{userId}/reset-password:
 *   post:
 *     summary: Admin force reset password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *             required: [password]
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post(
  '/admin/:userId/reset-password',
  adminLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  controller.adminForcePasswordReset,
);

module.exports = router;
