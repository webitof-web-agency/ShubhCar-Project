const express = require('express');
const auth = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/validate.middleware');
const ROLES = require('../../../constants/roles');
const controller = require('../controllers/attribute.controller');
const validateId = require('../../../middlewares/objectId.middleware');
const {
  attributeListQuerySchema,
  attributeCreateSchema,
  attributeUpdateSchema,
} = require('../vehicleManagement.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/vehicle-attributes:
 *   get:
 *     summary: List vehicle attributes
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Attributes }
 */
router.get(
  '/',
  auth([ROLES.ADMIN]),
  validate(attributeListQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/vehicle-attributes/with-values:
 *   get:
 *     summary: List vehicle attributes with values
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Attributes with values }
 */
router.get(
  '/with-values',
  auth([ROLES.ADMIN]),
  validate(attributeListQuerySchema, 'query'),
  controller.listWithValues,
);

/**
 * @openapi
 * /api/v1/vehicle-attributes:
 *   post:
 *     summary: Create vehicle attribute
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *             required: [name]
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/',
  auth([ROLES.ADMIN]),
  validate(attributeCreateSchema),
  controller.create,
);

/**
 * @openapi
 * /api/v1/vehicle-attributes/{id}:
 *   get:
 *     summary: Get vehicle attribute by id
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Attribute }
 */
router.get('/:id', auth([ROLES.ADMIN]), validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/vehicle-attributes/{id}:
 *   put:
 *     summary: Update vehicle attribute
 *     tags: [Vehicle]
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
 *               code: { type: string }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(attributeUpdateSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/vehicle-attributes/{id}:
 *   delete:
 *     summary: Delete vehicle attribute
 *     tags: [Vehicle]
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
