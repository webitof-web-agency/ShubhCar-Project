const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./shippingRules.controller');
const validateId = require('../../middlewares/objectId.middleware');
const {
  listShippingRulesQuerySchema,
  createShippingRuleSchema,
  updateShippingRuleSchema,
} = require('./shippingRules.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/shipping-rules:
 *   get:
 *     summary: List shipping rules
 *     tags: [Shipping]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Shipping rules }
 */
router.get(
  '/',
  auth([ROLES.ADMIN]),
  validate(listShippingRulesQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/shipping-rules:
 *   post:
 *     summary: Create shipping rule
 *     tags: [Shipping]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               conditions: { type: object }
 *               rate: { type: number }
 *             required: [name, rate]
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/',
  auth([ROLES.ADMIN]),
  validate(createShippingRuleSchema),
  controller.create,
);

/**
 * @openapi
 * /api/v1/shipping-rules/{id}:
 *   put:
 *     summary: Update shipping rule
 *     tags: [Shipping]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(updateShippingRuleSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/shipping-rules/{id}:
 *   delete:
 *     summary: Delete shipping rule
 *     tags: [Shipping]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:id', auth([ROLES.ADMIN]), validateId('id'), controller.remove);

module.exports = router;
