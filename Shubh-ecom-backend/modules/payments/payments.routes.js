const express = require('express');

/* =======================
   MIDDLEWARES
======================= */
const auth = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');
const validate = require('../../middlewares/validate.middleware');
const { paymentLimiter } = require('../../middlewares/rateLimiter.middleware');

/* =======================
   CONTROLLER
======================= */
const controller = require('./payments.controller');

/* =======================
   VALIDATORS
======================= */
const {
  initiatePaymentSchema,
  retryPaymentSchema,
  refundApprovalSchema,
} = require('./payment.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/payments/methods:
 *   get:
 *     summary: List enabled payment methods
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Available gateways
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     methods:
 *                       type: array
 *                       items: { type: string }
 */
router.get('/methods', controller.getMethods);

/* =======================
   PAYMENT ACTIONS
======================= */

router.post(
  '/initiate',
  paymentLimiter,
  auth([ROLES.CUSTOMER, ROLES.ADMIN]),
  validate(initiatePaymentSchema),
  controller.initiate,
);
/**
 * @openapi
 * /api/v1/payments/initiate:
 *   post:
 *     summary: Initiate payment
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId: { type: string }
 *               gateway: { type: string }
 *             required: [orderId, gateway]
 *     responses:
 *       200: { description: Payment intent }
 */

router.post(
  '/retry',
  paymentLimiter,
  auth([ROLES.CUSTOMER, ROLES.ADMIN]),
  validate(retryPaymentSchema),
  controller.retry,
);
/**
 * @openapi
 * /api/v1/payments/retry:
 *   post:
 *     summary: Retry payment
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId: { type: string }
 *               gateway: { type: string }
 *             required: [orderId, gateway]
 *     responses:
 *       200: { description: Payment retry enqueued }
 */

/**
 * @openapi
 * /api/v1/payments/{paymentId}/status:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/PaymentIntent'
 */
router.get(
  '/:paymentId/status',
  auth([ROLES.CUSTOMER, ROLES.ADMIN]),
  controller.getStatus,
);

router.post(
  '/:paymentId/confirm',
  paymentLimiter,
  auth([ROLES.CUSTOMER, ROLES.ADMIN]),
  controller.confirmPayment,
);
/**
 * @openapi
 * /api/v1/payments/{paymentId}/confirm:
 *   post:
 *     summary: Confirm payment (COD/manual)
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Confirmation result }
 */

router.post(
  '/admin/:paymentId/refund',
  paymentLimiter,
  auth([ROLES.ADMIN]),
  validate(refundApprovalSchema),
  controller.adminApproveRefund,
);
/**
 * @openapi
 * /api/v1/payments/admin/{paymentId}/refund:
 *   post:
 *     summary: Approve refund
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *               reason: { type: string }
 *             required: [amount, reason]
 *     responses:
 *       200: { description: Refund approved }
 */

router.get(
  '/admin/list',
  paymentLimiter,
  auth([ROLES.ADMIN]),
  controller.adminList,
);
/**
 * @openapi
 * /api/v1/payments/admin/list:
 *   get:
 *     summary: List payments (Admin)
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Payments list }
 */

module.exports = router;
