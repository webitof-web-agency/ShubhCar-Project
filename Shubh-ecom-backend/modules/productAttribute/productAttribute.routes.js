const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./productAttribute.controller');
const { upsertSchema } = require('./productAttribute.validator');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');

const router = express.Router();

/**
 * @openapi
 * /api/v1/product-attributes/{productId}/attributes:
 *   get:
 *     summary: List attributes on a product
 *     tags: [Products]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Attributes }
 */
router.get('/:productId/attributes', auth(), validateId('productId'), controller.list);

/**
 * @openapi
 * /api/v1/product-attributes/{productId}/attributes/{attributeId}:
 *   put:
 *     summary: Upsert attribute on product
 *     tags: [Products]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: attributeId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttributeValue'
 *     responses:
 *       200: { description: Upserted }
 */
router.put('/:productId/attributes/:attributeId', adminLimiter, auth([ROLES.ADMIN]), validateId('productId'), validateId('attributeId'), validate(upsertSchema), controller.upsert);

/**
 * @openapi
 * /api/v1/product-attributes/{productId}/attributes/{attributeId}:
 *   delete:
 *     summary: Remove attribute from product
 *     tags: [Products]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: attributeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:productId/attributes/:attributeId', adminLimiter, auth([ROLES.ADMIN]), validateId('productId'), validateId('attributeId'), controller.remove);

module.exports = router;
