const express = require('express');
const auth = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/validate.middleware');
const ROLES = require('../../../constants/roles');
const controller = require('../controllers/modelYear.controller');
const validateId = require('../../../middlewares/objectId.middleware');
const {
  modelYearListQuerySchema,
  modelYearCreateSchema,
  modelYearUpdateSchema,
} = require('../vehicleManagement.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/vehicle-model-years:
 *   get:
 *     summary: List vehicle model years
 *     tags: [Vehicle]
 *     responses:
 *       200: { description: Model years }
 */
router.get('/', validate(modelYearListQuerySchema, 'query'), controller.list);

/**
 * @openapi
 * /api/v1/vehicle-model-years:
 *   post:
 *     summary: Create vehicle model year
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modelId: { type: string }
 *               year: { type: integer }
 *             required: [modelId, year]
 *     responses:
 *       201: { description: Created }
 */
router.post('/', auth([ROLES.ADMIN]), validate(modelYearCreateSchema), controller.create);

/**
 * @openapi
 * /api/v1/vehicle-model-years/{id}:
 *   get:
 *     summary: Get vehicle model year by id
 *     tags: [Vehicle]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Model year }
 */
router.get('/:id', validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/vehicle-model-years/{id}:
 *   put:
 *     summary: Update vehicle model year
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
 *               modelId: { type: string }
 *               year: { type: integer }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(modelYearUpdateSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/vehicle-model-years/{id}:
 *   delete:
 *     summary: Delete vehicle model year
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
