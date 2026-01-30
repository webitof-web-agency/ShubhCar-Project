// backend/modules/orders/orders.routes.js
const express = require('express');
const controller = require('./orders.controller');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');
const cacheRead = require('../../middlewares/cacheRead');
const cacheKeys = require('../../lib/cache/keys');

const { placeOrderSchema, adminCreateOrderSchema } = require('./order.validator');
const {
  cancelOrderSchema,
  adminStatusUpdateSchema,
  adminPaymentUpdateSchema,
  fraudFlagSchema,
} = require('./orderStatus.validator');

const router = express.Router();

/* =======================
   USER ROUTES
======================= */

/**
 * @openapi
 * /api/v1/orders/place:
 *   post:
 *     summary: Place an order from the current cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 example: cod
 *               shippingAddressId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/OrderSummary'
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Invalid order request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/place',
  auth(),
  validate(placeOrderSchema),
  controller.placeOrder,
);

/**
 * @openapi
 * /api/v1/orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel an order initiated by the same user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order cancellation accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/OrderSummary'
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Cancellation not allowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/:orderId/cancel',
  auth(),
  validateId('orderId'),
  validate(cancelOrderSchema),
  controller.cancelMyOrder,
);

/**
 * @openapi
 * /api/v1/orders/my:
 *   get:
 *     summary: List orders for the authenticated user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrderSummary'
 *                 success:
 *                   type: boolean
 */
router.get('/my', auth(), controller.myOrders);

/* =======================
   ADMIN CMS ROUTES
======================= */

// Admin-specific routes - must come before generic routes to match correctly
router.get(
  '/admin/counts',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: () => cacheKeys.analytics.orderStatusCounts(),
    allowAuth: true,
    allowBlocked: true,
    ttl: 60,
  }),
  controller.adminGetStatusCounts,
);
router.get('/admin/:orderId/notes', adminLimiter, auth([ROLES.ADMIN]), validateId('orderId'), controller.adminGetOrderNotes);
router.post('/admin/:orderId/notes', adminLimiter, auth([ROLES.ADMIN]), validateId('orderId'), controller.adminAddOrderNote);
router.post(
  '/admin/create',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(adminCreateOrderSchema),
  controller.adminCreateOrder,
);

/**
 * @openapi
 * /api/v1/orders:
 *   get:
 *     summary: List all orders (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrderSummary'
 *                 success:
 *                   type: boolean
 */
router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.adminList);

/**
 * @openapi
 * /api/v1/orders/admin/{orderId}/history:
 *   get:
 *     summary: Get order history/audit logs (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order history
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.get(
  '/admin/:orderId/history',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('orderId'),
  controller.adminGetOrderHistory,
);

/**
 * @openapi
 * /api/v1/orders/admin/{orderId}:
 *   get:
 *     summary: Get full order details for admin
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderSummary'
 */
router.get(
  '/admin/:orderId',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('orderId'),
  controller.adminGetOrder,
);

/**
 * @openapi
 * /api/v1/orders/{orderId}/status:
 *   post:
 *     summary: Update order status (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *             required: [status]
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post(
  '/:orderId/status',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('orderId'),
  validate(adminStatusUpdateSchema),
  controller.adminUpdateStatus,
);

/**
 * @openapi
 * /api/v1/orders/{orderId}/payment-status:
 *   post:
 *     summary: Update payment status (Admin, COD only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *               amount:
 *                 type: number
 *               note:
 *                 type: string
 *             required: [status]
 *     responses:
 *       200:
 *         description: Payment status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post(
  '/:orderId/payment-status',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('orderId'),
  validate(adminPaymentUpdateSchema),
  controller.adminUpdatePaymentStatus,
);
/**
 * @openapi
 * /api/v1/orders/admin/{orderId}/fraud:
 *   post:
 *     summary: Flag an order as potential fraud (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *               fraudFlag:
 *                 type: boolean
 *               reason:
 *                 type: string
 *             required: [fraudFlag]
 *     responses:
 *       200:
 *         description: Fraud flag updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post(
  '/admin/:orderId/fraud',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('orderId'),
  validate(fraudFlagSchema),
  controller.adminFlagFraud,
);

/* =======================
   USER ORDER DETAIL (LAST)
======================= */

/**
 * @openapi
 * /api/v1/orders/{orderId}:
 *   get:
 *     summary: Get order detail for the authenticated user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/OrderSummary'
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:orderId', auth(), validateId('orderId'), controller.getOrder);
module.exports = router;
