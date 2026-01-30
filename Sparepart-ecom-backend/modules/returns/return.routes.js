const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const validate = require('../../middlewares/validate.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./return.controller');
const ROLES = require('../../constants/roles');
const {
  createReturnSchema,
  adminDecisionSchema,
  vendorConfirmSchema,
  completeSchema,
} = require('./return.validator');

const router = express.Router();

// User: create return request
router.post('/', auth(), validate(createReturnSchema), controller.create);

// User/vendor/admin: get return
router.get('/:id', auth(), validateId('id'), controller.get);

// Admin: list returns
router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.list);

// Admin: approve/reject
router.post(
  '/:id/decision',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(adminDecisionSchema),
  controller.adminDecision,
);

// Vendor: confirm receipt/participation
router.post(
  '/:id/vendor-confirm',
  auth([ROLES.VENDOR]),
  validateId('id'),
  validate(vendorConfirmSchema),
  controller.vendorConfirm,
);

// Admin: mark completed
router.post(
  '/:id/complete',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(completeSchema),
  controller.complete,
);

module.exports = router;
