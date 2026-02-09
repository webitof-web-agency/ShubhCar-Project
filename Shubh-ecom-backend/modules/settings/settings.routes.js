const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./settings.controller');
const {
  listSettingsQuerySchema,
  updateSettingsSchema,
} = require('./settings.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/settings/public:
 *   get:
 *     summary: Get public settings
 *     tags: [Settings]
 *     responses:
 *       200: { description: Public settings }
 */
router.get('/public', controller.listPublic);

/**
 * @openapi
 * /api/v1/settings:
 *   get:
 *     summary: Get all settings (Admin)
 *     tags: [Settings]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Settings }
 */
router.get(
  '/',
  auth([ROLES.ADMIN]),
  validate(listSettingsQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/settings:
 *   put:
 *     summary: Update settings (Admin)
 *     tags: [Settings]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Updated }
 */
router.put('/', auth([ROLES.ADMIN]), validate(updateSettingsSchema), controller.updateBulk);

module.exports = router;
