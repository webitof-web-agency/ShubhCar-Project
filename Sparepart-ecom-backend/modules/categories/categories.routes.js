const express = require('express');
const controller = require('./categories.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const cacheRead = require('../../middlewares/cacheRead');

const cacheKeys = require('../../lib/cache/keys');
const catKeys = cacheKeys.catalog.categories;

const router = express.Router();

// Admin CRUD
router.post('/admin', adminLimiter, controller.create);
router.put('/admin/:id', adminLimiter, validateId('id'), controller.update);
router.delete('/admin/:id', adminLimiter, validateId('id'), controller.remove);

// Read-only hierarchy viewer (no cache, full tree)
router.get('/hierarchy', controller.getHierarchy);

/**
 * @openapi
 * /api/v1/categories/roots:
 *   get:
 *     summary: Fetch top-level categories
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: List of root categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *                 success:
 *                   type: boolean
 */
router.get(
  '/roots',
  controller.getRoots,
);

/**
 * @openapi
 * /api/v1/categories/children/{parentId}:
 *   get:
 *     summary: List child categories for a parent
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Child categories returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *                 success:
 *                   type: boolean
 */
router.get(
  '/children/:parentId',
  validateId('parentId'),
  controller.getChildren,
);

/**
 * @openapi
 * /api/v1/categories/{slug}:
 *   get:
 *     summary: Get category details by slug
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 success:
 *                   type: boolean
 */
router.get(
  '/:slug',
  controller.getBySlug,
);

module.exports = router;
