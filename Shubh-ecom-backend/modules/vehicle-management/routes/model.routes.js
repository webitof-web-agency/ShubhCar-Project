const express = require('express');
const auth = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/validate.middleware');
const ROLES = require('../../../constants/roles');
const controller = require('../controllers/model.controller');
const validateId = require('../../../middlewares/objectId.middleware');
const {
  modelListQuerySchema,
  modelCreateSchema,
  modelUpdateSchema,
} = require('../vehicleManagement.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/vehicle-models:
 *   get:
 *     summary: List vehicle models
 *     tags: [Vehicle]
 *     responses:
 *       200: { description: Models }
 */
router.get('/', validate(modelListQuerySchema, 'query'), controller.list);

/**
 * @openapi
 * /api/v1/vehicle-models:
 *   post:
 *     summary: Create vehicle model
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
 *               brandId: { type: string }
 *             required: [name]
 *     responses:
 *       201: { description: Created }
 */
router.post('/', auth([ROLES.ADMIN]), validate(modelCreateSchema), controller.create);

/**
 * @openapi
 * /api/v1/vehicle-models/{id}:
 *   get:
 *     summary: Get vehicle model by id
 *     tags: [Vehicle]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Model }
 */
router.get('/:id', validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/vehicle-models/{id}:
 *   put:
 *     summary: Update vehicle model
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
 *               brandId: { type: string }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(modelUpdateSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/vehicle-models/{id}:
 *   delete:
 *     summary: Delete vehicle model
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
