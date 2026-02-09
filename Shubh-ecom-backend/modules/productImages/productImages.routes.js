const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./productImages.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');
const {
  listProductImagesQuerySchema,
  createProductImageSchema,
  updateProductImageSchema,
} = require('./productImages.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/product-images:
 *   get:
 *     summary: List product images
 *     tags: [Products]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Images list }
 */
router.get(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(listProductImagesQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/product-images/{id}:
 *   get:
 *     summary: Get product image by id
 *     tags: [Products]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Image }
 */
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/product-images:
 *   post:
 *     summary: Create product image
 *     tags: [Products]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId: { type: string }
 *               url: { type: string, format: uri }
 *               alt: { type: string }
 *               position: { type: integer }
 *             required: [productId, url]
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(createProductImageSchema),
  controller.create,
);

/**
 * @openapi
 * /api/v1/product-images/{id}:
 *   put:
 *     summary: Update product image
 *     tags: [Products]
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
 *               url: { type: string, format: uri }
 *               alt: { type: string }
 *               position: { type: integer }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(updateProductImageSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/product-images/{id}:
 *   delete:
 *     summary: Delete product image
 *     tags: [Products]
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
