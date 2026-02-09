const express = require('express');
const auth = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/validate.middleware');
const ROLES = require('../../../constants/roles');
const controller = require('../controllers/year.controller');
const validateId = require('../../../middlewares/objectId.middleware');
const {
  yearListQuerySchema,
  yearCreateSchema,
  yearUpdateSchema,
} = require('../vehicleManagement.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/vehicle-years:
 *   get:
 *     summary: List vehicle years
 *     tags: [Vehicle]
 *     responses:
 *       200: { description: Years }
 */
router.get('/', validate(yearListQuerySchema, 'query'), controller.list);

/**
 * @openapi
 * /api/v1/vehicle-years:
 *   post:
 *     summary: Create vehicle year
 *     tags: [Vehicle]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               year: { type: integer }
 *     responses:
 *       201: { description: Created }
 */
router.post('/', auth([ROLES.ADMIN]), validate(yearCreateSchema), controller.create);

/**
 * @openapi
 * /api/v1/vehicle-years/{id}:
 *   get:
 *     summary: Get vehicle year by id
 *     tags: [Vehicle]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Year }
 */
router.get('/:id', validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/vehicle-years/{id}:
 *   put:
 *     summary: Update vehicle year
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
 *               year: { type: integer }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(yearUpdateSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/vehicle-years/{id}:
 *   delete:
 *     summary: Delete vehicle year
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
