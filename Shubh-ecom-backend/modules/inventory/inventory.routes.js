const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./inventory.controller');
const {
  summaryQuerySchema,
  listProductsQuerySchema,
  adjustStockSchema,
} = require('./inventory.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/inventory/summary:
 *   get:
 *     summary: Inventory summary
 *     tags: [Inventory]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Summary
 */
router.get(
  '/summary',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(summaryQuerySchema, 'query'),
  controller.summary,
);

/**
 * @openapi
 * /api/v1/inventory/products:
 *   get:
 *     summary: List product inventory
 *     tags: [Inventory]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Inventory list
 */
router.get(
  '/products',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(listProductsQuerySchema, 'query'),
  controller.listProducts,
);

/**
 * @openapi
 * /api/v1/inventory/adjust:
 *   post:
 *     summary: Adjust stock
 *     tags: [Inventory]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId: { type: string }
 *               delta: { type: integer }
 *               reason: { type: string }
 *               reference: { type: string }
 *             required: [productId, delta]
 *     responses:
 *       200:
 *         description: Adjustment result
 */
router.post(
  '/adjust',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(adjustStockSchema),
  controller.adjustStock,
);

module.exports = router;
