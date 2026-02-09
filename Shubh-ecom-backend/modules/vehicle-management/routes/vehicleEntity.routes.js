const express = require('express');
const auth = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/validate.middleware');
const ROLES = require('../../../constants/roles');
const controller = require('../controllers/vehicle.controller');
const validateId = require('../../../middlewares/objectId.middleware');
const {
  vehicleListQuerySchema,
  vehicleExportQuerySchema,
  vehicleAvailableYearsQuerySchema,
  vehicleAvailableAttributesQuerySchema,
  vehicleCreateSchema,
  vehicleUpdateSchema,
} = require('../vehicleManagement.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/vehicles:
 *   get:
 *     summary: List vehicles
 *     tags: [Vehicle]
 *     responses:
 *       200: { description: Vehicles }
 */
router.get('/', validate(vehicleListQuerySchema, 'query'), controller.list);

/**
 * @openapi
 * /api/v1/vehicles/export:
 *   get:
 *     summary: Export vehicles
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Export file/url }
 */
router.get(
  '/export',
  auth([ROLES.ADMIN]),
  validate(vehicleExportQuerySchema, 'query'),
  controller.export,
);

/**
 * @openapi
 * /api/v1/vehicles/filters/years:
 *   get:
 *     summary: Available vehicle years
 *     tags: [Vehicle]
 *     responses:
 *       200: { description: Years }
 */
router.get(
  '/filters/years',
  validate(vehicleAvailableYearsQuerySchema, 'query'),
  controller.availableYears,
);

/**
 * @openapi
 * /api/v1/vehicles/filters/attributes:
 *   get:
 *     summary: Available vehicle filter attributes
 *     tags: [Vehicle]
 *     responses:
 *       200: { description: Attributes }
 */
router.get(
  '/filters/attributes',
  validate(vehicleAvailableAttributesQuerySchema, 'query'),
  controller.availableAttributes,
);

/**
 * @openapi
 * /api/v1/vehicles:
 *   post:
 *     summary: Create vehicle
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brandId: { type: string }
 *               modelId: { type: string }
 *               variantId: { type: string }
 *               year: { type: integer }
 *               attributes: { type: object }
 *     responses:
 *       201: { description: Created }
 */
router.post('/', auth([ROLES.ADMIN]), validate(vehicleCreateSchema), controller.create);

/**
 * @openapi
 * /api/v1/vehicles/{id}/detail:
 *   get:
 *     summary: Vehicle detail
 *     tags: [Vehicle]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vehicle detail }
 */
router.get('/:id/detail', validateId('id'), controller.detail);

/**
 * @openapi
 * /api/v1/vehicles/{id}:
 *   get:
 *     summary: Get vehicle by id
 *     tags: [Vehicle]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vehicle }
 */
router.get('/:id', validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/vehicles/{id}:
 *   put:
 *     summary: Update vehicle
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
 *               brandId: { type: string }
 *               modelId: { type: string }
 *               variantId: { type: string }
 *               year: { type: integer }
 *               attributes: { type: object }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(vehicleUpdateSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/vehicles/{id}:
 *   delete:
 *     summary: Delete vehicle
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
