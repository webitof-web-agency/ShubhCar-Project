const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./seo.controller');
const ROLES = require('../../constants/roles');
const cacheRead = require('../../middlewares/cacheRead');
const keys = require('../../lib/cache/keys');
const { upsertSeoSchema, resolveSeoQuerySchema } = require('./seo.validator');

const router = express.Router();

/* =======================
   ADMIN CMS
======================= */

/**
 * @openapi
 * /api/v1/seo:
 *   post:
 *     summary: Upsert SEO record
 *     tags: [SEO]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Upserted }
 */
router.post(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(upsertSeoSchema),
  controller.upsert,
);

/**
 * @openapi
 * /api/v1/seo:
 *   get:
 *     summary: List SEO records
 *     tags: [SEO]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: SEO list }
 */
router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.list);

/**
 * @openapi
 * /api/v1/seo/{id}:
 *   delete:
 *     summary: Deactivate SEO record
 *     tags: [SEO]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deactivated }
 */
router.delete('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.deactivate);

/* =======================
   SEO RESOLUTION
======================= */

// Example:
// /seo/resolve?entityType=product&entityId=xxxx
/**
 * @openapi
 * /api/v1/seo/resolve:
 *   get:
 *     summary: Resolve SEO metadata for a slug or entity
 *     tags: [SEO]
 *     parameters:
 *       - in: query
 *         name: slug
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SEO metadata resolved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/SeoResolution'
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/resolve',
  validate(resolveSeoQuerySchema, 'query'),
  cacheRead({
    key: (req) => keys.cms.seo(req.query.slug || keys.hashQuery(req.query)),
    ttl: 1800,
  }),
  controller.resolve,
);

module.exports = router;
