const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./tax.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { listTaxQuerySchema, createTaxSchema, updateTaxSchema } = require('./tax.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/tax/slabs:
 *   get:
 *     summary: List tax slabs
 *     tags: [Tax]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Tax slabs }
 */
router.get(
  '/slabs',
  auth([ROLES.ADMIN]),
  validate(listTaxQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/tax/slabs:
 *   post:
 *     summary: Create tax slab
 *     tags: [Tax]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               rate: { type: number }
 *               thresholds: { type: object }
 *               inclusive: { type: boolean }
 *             required: [name, rate]
 *     responses:
 *       201: { description: Created }
 */
router.post('/slabs', auth([ROLES.ADMIN]), validate(createTaxSchema), controller.create);

/**
 * @openapi
 * /api/v1/tax/slabs/{id}:
 *   put:
 *     summary: Update tax slab
 *     tags: [Tax]
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
 *             properties:
 *               name: { type: string }
 *               rate: { type: number }
 *               thresholds: { type: object }
 *               inclusive: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/slabs/:id',
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(updateTaxSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/tax/slabs/{id}:
 *   delete:
 *     summary: Delete tax slab
 *     tags: [Tax]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/slabs/:id', auth([ROLES.ADMIN]), validateId('id'), controller.remove);

module.exports = router;
