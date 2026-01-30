const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./reviews.controller');
const {
  createReviewSchema,
  updateReviewSchema,
} = require('./reviews.validator');
const ROLES = require('../../constants/roles');

const router = express.Router();

// Aggregate MUST come first
router.get(
  '/product/:productId/aggregate',
  validateId('productId'),
  controller.getAggregate,
);

// List reviews for a product
router.get(
  '/product/:productId',
  validateId('productId'),
  controller.listByProduct,
);

// Customer actions
router.post('/', auth(), validate(createReviewSchema), controller.create);

router.put(
  '/:id',
  auth(),
  validateId('id'),
  validate(updateReviewSchema),
  controller.update,
);

router.delete('/:id', auth(), validateId('id'), controller.remove);

// Admin CMS
router.get('/admin', adminLimiter, auth([ROLES.ADMIN]), controller.adminList);

router.get(
  '/admin/:reviewId',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('reviewId'),
  controller.adminGet,
);

module.exports = router;
