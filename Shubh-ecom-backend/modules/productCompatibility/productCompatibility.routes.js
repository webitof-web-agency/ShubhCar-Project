const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./productCompatibility.controller');
const validateId = require('../../middlewares/objectId.middleware');
const {
  upsertProductCompatibilitySchema,
} = require('./productCompatibility.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/product-compatibility/{productId}:
 *   get:
 *     summary: Get vehicle compatibility for a product
 *     tags: [Products]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Compatibility }
 */
router.get('/:productId', auth([ROLES.ADMIN]), validateId('productId'), controller.getByProduct);

/**
 * @openapi
 * /api/v1/product-compatibility/{productId}:
 *   put:
 *     summary: Set vehicle compatibility for a product
 *     tags: [Products]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleIds:
 *                 type: array
 *                 items: { type: string }
 *             required: [vehicleIds]
 *     responses:
 *       200: { description: Saved }
 */
router.put(
  '/:productId',
  auth([ROLES.ADMIN]),
  validateId('productId'),
  validate(upsertProductCompatibilitySchema),
  controller.upsert,
);

module.exports = router;
