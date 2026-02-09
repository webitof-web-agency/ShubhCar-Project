const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./emailTemplates.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');
const {
  listEmailTemplatesQuerySchema,
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
} = require('./emailTemplates.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/email-templates:
 *   get:
 *     summary: List email templates
 *     tags: [CMS]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Templates list }
 */
router.get(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(listEmailTemplatesQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/email-templates/{id}:
 *   get:
 *     summary: Get email template by id
 *     tags: [CMS]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Template }
 */
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/email-templates:
 *   post:
 *     summary: Create email template
 *     tags: [CMS]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               subject: { type: string }
 *               html: { type: string }
 *               variables: { type: array, items: { type: string } }
 *             required: [name, subject, html]
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(createEmailTemplateSchema),
  controller.create,
);

/**
 * @openapi
 * /api/v1/email-templates/{id}:
 *   put:
 *     summary: Update email template
 *     tags: [CMS]
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
 *               subject: { type: string }
 *               html: { type: string }
 *               variables: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(updateEmailTemplateSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/email-templates/{id}:
 *   delete:
 *     summary: Delete email template
 *     tags: [CMS]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.remove);

module.exports = router;
