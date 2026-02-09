const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./inventoryLogs.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');
const { listInventoryLogsQuerySchema } = require('./inventoryLogs.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/inventory-logs:
 *   get:
 *     summary: List inventory logs
 *     tags: [Inventory]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Logs list
 */
router.get(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(listInventoryLogsQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/inventory-logs/{id}:
 *   get:
 *     summary: Get inventory log by id
 *     tags: [Inventory]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Log entry
 */
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.get);

module.exports = router;
