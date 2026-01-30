const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./productCompatibility.controller');
const validateId = require('../../middlewares/objectId.middleware');

const router = express.Router();

router.get(
  '/:productId',
  auth([ROLES.ADMIN]),
  validateId('productId'),
  controller.getByProduct,
);
router.put(
  '/:productId',
  auth([ROLES.ADMIN]),
  validateId('productId'),
  controller.upsert,
);

module.exports = router;
