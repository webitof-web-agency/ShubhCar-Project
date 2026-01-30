const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./page.controller');
const ROLES = require('../../constants/roles');
const cacheRead = require('../../middlewares/cacheRead');
const keys = require('../../lib/cache/keys');

const router = express.Router();

/* =======================
   ADMIN CMS
======================= */

router.post('/', adminLimiter, auth([ROLES.ADMIN]), controller.create);
router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.list);
router.get(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  controller.get,
);
router.put(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  controller.update,
);
router.delete(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  controller.remove,
);

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
  cacheRead({ key: (req) => keys.cms.page(req.params.slug), ttl: 1800 }),
  controller.resolve,
);

module.exports = router;
