const express = require('express');
const auth = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/validate.middleware');
const ROLES = require('../../../constants/roles');
const controller = require('../controllers/attributeValue.controller');
const validateId = require('../../../middlewares/objectId.middleware');
const {
  attributeValueListQuerySchema,
  attributeValueCreateSchema,
  attributeValueUpdateSchema,
} = require('../vehicleManagement.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/vehicle-attribute-values:
 *   get:
 *     summary: List vehicle attribute values
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Attribute values }
 */
router.get(
  '/',
  auth([ROLES.ADMIN]),
  validate(attributeValueListQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/vehicle-attribute-values:
 *   post:
 *     summary: Create vehicle attribute value
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attributeId: { type: string }
 *               name: { type: string }
 *               code: { type: string }
 *             required: [attributeId, name]
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/',
  auth([ROLES.ADMIN]),
  validate(attributeValueCreateSchema),
  controller.create,
);

/**
 * @openapi
 * /api/v1/vehicle-attribute-values/{id}:
 *   get:
 *     summary: Get vehicle attribute value by id
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Attribute value }
 */
router.get('/:id', auth([ROLES.ADMIN]), validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/vehicle-attribute-values/{id}:
 *   put:
 *     summary: Update vehicle attribute value
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
  validate(attributeValueUpdateSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/vehicle-attribute-values/{id}:
 *   delete:
 *     summary: Delete vehicle attribute value
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
