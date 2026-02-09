const express = require('express');
const auth = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/validate.middleware');
const ROLES = require('../../../constants/roles');
const controller = require('../controllers/variant.controller');
const validateId = require('../../../middlewares/objectId.middleware');
const {
  variantListQuerySchema,
  variantCreateSchema,
  variantUpdateSchema,
} = require('../vehicleManagement.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/vehicle-variants:
 *   get:
 *     summary: List vehicle variants
 *     tags: [Vehicle]
 *     responses:
 *       200: { description: Variants }
 */
router.get('/', validate(variantListQuerySchema, 'query'), controller.list);

/**
 * @openapi
 * /api/v1/vehicle-variants:
 *   post:
 *     summary: Create vehicle variant
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
 *               modelId: { type: string }
 *             required: [name]
 *     responses:
 *       201: { description: Created }
 */
router.post('/', auth([ROLES.ADMIN]), validate(variantCreateSchema), controller.create);

/**
 * @openapi
 * /api/v1/vehicle-variants/{id}:
 *   get:
 *     summary: Get vehicle variant by id
 *     tags: [Vehicle]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Variant }
 */
router.get('/:id', validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/vehicle-variants/{id}:
 *   put:
 *     summary: Update vehicle variant
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
 *               modelId: { type: string }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(variantUpdateSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/vehicle-variants/{id}:
 *   delete:
 *     summary: Delete vehicle variant
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
