const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./categoryAttribute.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const {
  createCategoryAttributeSchema,
  updateCategoryAttributeSchema,
} = require('./categoryAttribute.validator');
const ROLES = require('../../constants/roles');

const router = express.Router();

router.get('/:categoryId', adminLimiter, auth([ROLES.ADMIN]), validateId('categoryId'), controller.list);

router.post(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(createCategoryAttributeSchema),
  controller.create,
);

router.put(
  '/:attributeId',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('attributeId'),
  validate(updateCategoryAttributeSchema),
  controller.update,
);

router.delete(
  '/:attributeId',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('attributeId'),
  controller.remove,
);

module.exports = router;
