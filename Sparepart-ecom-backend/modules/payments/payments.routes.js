const express = require('express');

/* =======================
   MIDDLEWARES
======================= */
const auth = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize.middleware');
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
 * Public payment methods (checkout)
 */
router.get('/methods', controller.getMethods);

/* =======================
   PAYMENT ACTIONS
======================= */

/**
 * Initiate payment
 * Roles: customer, vendor (admin allowed implicitly)
 */
router.post(
  '/initiate',
  paymentLimiter,
  auth(),
  authorize([ROLES.CUSTOMER, ROLES.VENDOR, ROLES.ADMIN]),
  validate(initiatePaymentSchema),
  controller.initiate,
);

/**
 * Retry payment
 * Roles: customer, admin
 */
router.post(
  '/retry',
  paymentLimiter,
  auth(),
  authorize([ROLES.CUSTOMER, ROLES.ADMIN]),
  validate(retryPaymentSchema),
  controller.retry,
);

router.get(
  '/:paymentId/status',
  auth(),
  authorize([ROLES.CUSTOMER, ROLES.ADMIN]),
  controller.getStatus,
);

router.post(
  '/:paymentId/confirm',
  paymentLimiter,
  auth(),
  authorize([ROLES.CUSTOMER, ROLES.ADMIN]),
  controller.confirmPayment,
);

router.post(
  '/admin/:paymentId/refund',
  paymentLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  validate(refundApprovalSchema),
  controller.adminApproveRefund,
);

router.get(
  '/admin/list',
  paymentLimiter,
  auth(),
  authorize([ROLES.ADMIN]),
  controller.adminList,
);

module.exports = router;
