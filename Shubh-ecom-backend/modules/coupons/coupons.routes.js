const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./coupons.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');
const {
  previewSchema,
  createSchema,
  updateSchema,
} = require('./coupon.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/coupons/public:
 *   get:
 *     summary: List public coupons
 *     tags: [Coupons]
 *     responses:
 *       200:
 *         description: Coupons
 */
router.get('/public', controller.listPublic);

/**
 * @openapi
 * /api/v1/coupons/preview:
 *   post:
 *     summary: Preview coupon against current cart
 *     tags: [Coupons]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *               cart: { type: object }
 *             required: [code]
 *     responses:
 *       200:
 *         description: Discount preview
 */
router.post('/preview', auth(), validate(previewSchema), controller.preview);

/**
 * @openapi
 * /api/v1/coupons/usage/list:
 *   get:
 *     summary: List coupon usages
 *     tags: [Coupons]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Usage list
 */
router.get('/usage/list', adminLimiter, auth([ROLES.ADMIN]), controller.listUsage);
/**
 * @openapi
 * /api/v1/coupons:
 *   get:
 *     summary: List coupons (Admin)
 *     tags: [Coupons]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Coupons list }
 */
router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.list);

/**
 * @openapi
 * /api/v1/coupons/{id}:
 *   get:
 *     summary: Get coupon by id (Admin)
 *     tags: [Coupons]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Coupon }
 */
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/coupons:
 *   post:
 *     summary: Create coupon (Admin)
 *     tags: [Coupons]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *               discountType: { type: string }
 *               amount: { type: number }
 *               startsAt: { type: string, format: date-time }
 *               endsAt: { type: string, format: date-time }
 *               usageLimit: { type: integer }
 *               constraints: { type: object }
 *             required: [code, discountType, amount]
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(createSchema),
  controller.create,
);

/**
 * @openapi
 * /api/v1/coupons/{id}:
 *   put:
 *     summary: Update coupon (Admin)
 *     tags: [Coupons]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *               discountType: { type: string }
 *               amount: { type: number }
 *               startsAt: { type: string, format: date-time }
 *               endsAt: { type: string, format: date-time }
 *               usageLimit: { type: integer }
 *               constraints: { type: object }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(updateSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/coupons/{id}:
 *   delete:
 *     summary: Delete coupon (Admin)
 *     tags: [Coupons]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.remove);

module.exports = router;
