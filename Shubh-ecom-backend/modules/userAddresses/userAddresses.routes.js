const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./userAddresses.controller');
const validateId = require('../../middlewares/objectId.middleware');
const ROLES = require('../../constants/roles');
const {
  createUserAddressSchema,
  updateUserAddressSchema,
} = require('./userAddresses.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/user-addresses:
 *   get:
 *     summary: List addresses for current user
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Addresses }
 */
router.get('/', auth(), controller.list);

/**
 * @openapi
 * /api/v1/user-addresses/admin/{userId}:
 *   get:
 *     summary: List addresses for user (Admin)
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Addresses }
 */
router.get('/admin/:userId', auth([ROLES.ADMIN]), validateId('userId'), controller.adminListByUser);

/**
 * @openapi
 * /api/v1/user-addresses/{id}:
 *   get:
 *     summary: Get address by id
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Address }
 */
router.get('/:id', auth(), validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/user-addresses:
 *   post:
 *     summary: Create address
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               phone: { type: string }
 *               line1: { type: string }
 *               line2: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               postalCode: { type: string }
 *               country: { type: string }
 *             required: [fullName, phone, line1, city, state, postalCode]
 *     responses:
 *       201: { description: Created }
 */
router.post('/', auth(), validate(createUserAddressSchema), controller.create);

/**
 * @openapi
 * /api/v1/user-addresses/{id}:
 *   put:
 *     summary: Update address
 *     tags: [Users]
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
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  auth(),
  validateId('id'),
  validate(updateUserAddressSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/user-addresses/{id}:
 *   delete:
 *     summary: Delete address
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:id', auth(), validateId('id'), controller.remove);

module.exports = router;
