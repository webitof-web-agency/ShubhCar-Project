const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./productAttribute.controller');
const { upsertSchema } = require('./productAttribute.validator');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');

const router = express.Router();

router.get('/:productId/attributes', auth(), validateId('productId'), controller.list);

router.put(
  '/:productId/attributes/:attributeId',
  adminLimiter,
  auth(),
  validateId('productId'),
  validateId('attributeId'),
  validate(upsertSchema),
  controller.upsert,
);

router.delete(
  '/:productId/attributes/:attributeId',
  adminLimiter,
  auth(),
  validateId('productId'),
  validateId('attributeId'),
  controller.remove,
);

module.exports = router;
