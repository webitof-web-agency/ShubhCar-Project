const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./page.controller');
const ROLES = require('../../constants/roles');
const cacheRead = require('../../middlewares/cacheRead');
const keys = require('../../lib/cache/keys');
const {
  listPagesQuerySchema,
  createPageSchema,
  updatePageSchema,
  resolvePageParamsSchema,
} = require('./page.validator');

const router = express.Router();

/* =======================
   ADMIN CMS
======================= */

/**
 * @openapi
 * /api/v1/pages:
 *   post:
 *     summary: Create page (Admin)
 *     tags: [CMS]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               slug: { type: string }
 *               content: { type: string }
 *               seo: { type: object }
 *               published: { type: boolean }
 *             required: [title, slug, content]
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(createPageSchema),
  controller.create,
);

/**
 * @openapi
 * /api/v1/pages:
 *   get:
 *     summary: List pages (Admin)
 *     tags: [CMS]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Pages }
 */
router.get(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(listPagesQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/pages/{id}:
 *   get:
 *     summary: Get page by id (Admin)
 *     tags: [CMS]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Page }
 */
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/pages/{id}:
 *   put:
 *     summary: Update page (Admin)
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
 *               title: { type: string }
 *               slug: { type: string }
 *               content: { type: string }
 *               seo: { type: object }
 *               published: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(updatePageSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/pages/{id}:
 *   delete:
 *     summary: Delete page (Admin)
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

/* =======================
   PUBLIC
======================= */

// /pages/about-us
/**
 * @openapi
 * /api/v1/pages/slug/{slug}:
 *   get:
 *     summary: Resolve a published CMS page by slug
 *     tags: [CMS]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Page content returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PageContent'
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Page not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/slug/:slug',
  validate(resolvePageParamsSchema, 'params'),
  cacheRead({ key: (req) => keys.cms.page(req.params.slug), ttl: 1800 }),
  controller.resolve,
);

module.exports = router;
