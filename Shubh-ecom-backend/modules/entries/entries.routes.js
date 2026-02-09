const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./entries.controller');
const {
  createEntrySchema,
  listEntriesQuerySchema,
} = require('./entries.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/entries:
 *   post:
 *     summary: Submit contact/entry form
 *     tags: [Entries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               message: { type: string }
 *               type: { type: string }
 *             required: [name, message]
 *     responses:
 *       201: { description: Entry created }
 */
router.post('/', validate(createEntrySchema), controller.create);

/**
 * @openapi
 * /api/v1/entries/stats:
 *   get:
 *     summary: Entry stats
 *     tags: [Entries]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Stats }
 */
router.get('/stats', auth([ROLES.ADMIN]), controller.stats);

/**
 * @openapi
 * /api/v1/entries:
 *   get:
 *     summary: List entries (Admin)
 *     tags: [Entries]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Entries }
 */
router.get(
  '/',
  auth([ROLES.ADMIN]),
  validate(listEntriesQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/entries/{id}:
 *   get:
 *     summary: Get entry by id
 *     tags: [Entries]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Entry }
 */
router.get('/:id', auth([ROLES.ADMIN]), validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/entries/{id}:
 *   delete:
 *     summary: Delete entry
 *     tags: [Entries]
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

/**
 * @openapi
 * /api/v1/entries/{id}/read:
 *   patch:
 *     summary: Mark entry as read
 *     tags: [Entries]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Marked read }
 */
router.patch(
  '/:id/read',
  auth([ROLES.ADMIN]),
  validateId('id'),
  controller.markRead,
);

module.exports = router;
