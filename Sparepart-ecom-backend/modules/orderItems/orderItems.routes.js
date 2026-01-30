// backend/modules/orderItems/orderItems.routes.js
const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const controller = require('./orderItems.controller');
const { updateOrderItemStatusSchema } = require('./orderItems.validator');
const ROLES = require('../../constants/roles');

const router = express.Router();

/*
  RULES:
  - vendor: can update only their own items (confirmed → packed → shipped)
  - admin: can do refund / return
*/
router.patch(
  '/:id/status',
  auth([ROLES.VENDOR, ROLES.ADMIN]),
  validateId('id'),
  validate(updateOrderItemStatusSchema),
  controller.updateStatus,
);

module.exports = router;
