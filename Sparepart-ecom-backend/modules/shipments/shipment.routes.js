const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const controller = require('./shipment.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
  createShipmentSchema,
  updateShipmentSchema,
} = require('./shipment.validator');
const ROLES = require('../../constants/roles');

const router = express.Router();

/* =======================
   ADMIN CMS ROUTES
======================= */

// list all shipments (global)
router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.list);

// ✅ CMS: list shipments by ORDER
router.get(
  '/admin/order/:orderId',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('orderId'),
  controller.adminListByOrder,
);

// vendor list own shipments
router.get('/vendor', auth([ROLES.VENDOR]), controller.vendorList);

// get single shipment
router.get(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  controller.get,
);

// create shipment
router.post(
  '/:orderItemId',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('orderItemId'),
  validate(createShipmentSchema),
  controller.create,
);

// update shipment status
router.patch(
  '/:orderItemId/status',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('orderItemId'),
  validate(updateShipmentSchema),
  controller.updateStatus,
);

// vendor updates status for their items
router.patch(
  '/vendor/:orderItemId/status',
  auth([ROLES.VENDOR]),
  validateId('orderItemId'),
  validate(updateShipmentSchema),
  controller.vendorUpdateStatus,
);

// delete shipment
router.delete(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  controller.remove,
);

/* =======================
   USER ROUTES
======================= */

// tracking
router.get(
  '/track/:orderItemId',
  auth(),
  validateId('orderItemId'),
  controller.trackByOrderItem,
);

// calculation
router.post('/calculate', auth(), controller.calculate);

module.exports = router;
