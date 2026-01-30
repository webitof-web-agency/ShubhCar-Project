const express = require('express');
const controller = require('./products.controller');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const {
  createProductSchema,
  updateProductSchema,
} = require('./product.validator');
const ROLES = require('../../constants/roles');
const cacheRead = require('../../middlewares/cacheRead');
const keys = require('../../lib/cache/keys');
const { uploadProductImages } = require('../../middlewares/productImageUpload.middleware');
const multer = require('multer');

const router = express.Router();
const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    if (name.endsWith('.csv') || name.endsWith('.xlsx')) {
      return cb(null, true);
    }
    return cb(new Error('Only CSV or XLSX files are allowed'));
  },
});

// Public
/**
 * @openapi
 * /api/v1/products/featured:
 *   get:
 *     summary: List featured products for storefront
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: Featured products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductSummary'
 *                 success:
 *                   type: boolean
 */
router.get(
  '/featured',
  cacheRead({
    key: (req) => keys.catalog.productsList({ ...req.query, featured: true }),
    ttl: 600,
  }),
  controller.listFeatured,
);

/**
 * @openapi
 * /api/v1/products/category/{categoryId}:
 *   get:
 *     summary: List products under a category
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Products returned for category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductSummary'
 *                 success:
 *                   type: boolean
 */
router.get(
  '/category/:categoryId',
  validateId('categoryId'),
  cacheRead({
    key: (req) =>
      keys.catalog.productsByCategory(req.params.categoryId, req.query),
    ttl: 600,
  }),
  controller.listByCategory,
);

// Public product list with filters
router.get(
  '/',
  controller.listPublic,
);

router.get(
  '/id/:productId',
  validateId('productId'),
  controller.getByIdPublic,
);

router.get(
  '/id/:productId/compatibility',
  validateId('productId'),
  controller.getCompatibility,
);

router.get(
  '/id/:productId/alternatives',
  validateId('productId'),
  controller.getAlternatives,
);

// Admin CMS
/**
 * @openapi
 * /api/v1/products/admin/list:
 *   get:
 *     summary: List all products for admin (CMS)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductSummary'
 *                 success:
 *                   type: boolean
 */
router.get('/admin/list', adminLimiter, auth([ROLES.ADMIN]), controller.adminList);

router.post(
  '/admin/bulk-update/preview',
  adminLimiter,
  auth([ROLES.ADMIN]),
  bulkUpload.single('file'),
  controller.adminBulkUpdatePreview,
);

router.get(
  '/admin/bulk-update/template',
  adminLimiter,
  auth([ROLES.ADMIN]),
  controller.adminBulkUpdateTemplate,
);

router.get(
  '/admin/bulk-update/export',
  adminLimiter,
  auth([ROLES.ADMIN]),
  controller.adminBulkUpdateExport,
);

router.post(
  '/admin/bulk-update/confirm',
  adminLimiter,
  auth([ROLES.ADMIN]),
  controller.adminBulkUpdateConfirm,
);

router.get(
  '/admin/bulk-update/jobs/:jobId',
  adminLimiter,
  auth([ROLES.ADMIN]),
  controller.adminBulkUpdateStatus,
);

router.post(
  '/admin/bulk-create/preview',
  adminLimiter,
  auth([ROLES.ADMIN]),
  bulkUpload.single('file'),
  controller.adminBulkCreatePreview,
);

router.post(
  '/admin/bulk-create/confirm',
  adminLimiter,
  auth([ROLES.ADMIN]),
  controller.adminBulkCreateConfirm,
);

router.get(
  '/admin/bulk-create/jobs/:jobId',
  adminLimiter,
  auth([ROLES.ADMIN]),
  controller.adminBulkCreateStatus,
);

router.get(
  '/admin/bulk-create/template',
  adminLimiter,
  auth([ROLES.ADMIN]),
  controller.adminBulkCreateTemplate,
);

router.get(
  '/admin/bulk-create/export',
  adminLimiter,
  auth([ROLES.ADMIN]),
  controller.adminBulkCreateExport,
);

router.get(
  '/admin/:productId',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('productId'),
  controller.adminGet,
);

/**
 * @openapi
 * /api/v1/products/admin/{productId}/approve:
 *   post:
 *     summary: Approve a product (Admin)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post(
  '/admin/:productId/approve',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('productId'),
  controller.adminApprove,
);

/**
 * @openapi
 * /api/v1/products/admin/{productId}:
 *   delete:
 *     summary: Force delete a product (Admin)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */

/**
 * @openapi
 * /api/v1/products/admin/{productId}/restore:
 *   post:
 *     summary: Restore a soft-deleted product (Admin)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product restored
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post(
  '/admin/:productId/restore',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('productId'),
  controller.adminRestore,
);

/**
 * @openapi
 * /api/v1/products/admin/empty-trash:
 *   delete:
 *     summary: Empty trash (Admin)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trash emptied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.delete(
  '/admin/empty-trash',
  adminLimiter,
  auth([ROLES.ADMIN]),
  controller.adminEmptyTrash,
);

/**
 * @openapi
 * /api/v1/products/admin/{productId}:
 *   delete:
 *     summary: Force delete a product (Admin)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.delete(
  '/admin/:productId',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('productId'),
  controller.adminDelete,
);

/**
 * @openapi
 * /api/v1/products/admin/{productId}/force-delete:
 *   delete:
 *     summary: Permanently delete a product (Admin)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product permanently deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.delete(
  '/admin/:productId/force-delete',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('productId'),
  controller.adminForceDelete,
);

// Vendor/Admin (protected)
/**
 * @openapi
 * /api/v1/products:
 *   post:
 *     summary: Create a new product (Vendor/Admin)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               categoryId:
 *                 type: string
 *             required: [name, price, categoryId]
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post('/', auth(), validate(createProductSchema), controller.create);

router.post(
  '/:productId/images',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('productId'),
  uploadProductImages.array('images', 5),
  controller.uploadImages,
);

/**
 * @openapi
 * /api/v1/products/{productId}:
 *   put:
 *     summary: Update a product (Vendor/Admin)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.put(
  '/:productId',
  auth(),
  validateId('productId'),
  validate(updateProductSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/products/{productId}:
 *   delete:
 *     summary: Soft delete a product (Vendor/Admin)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.delete(
  '/:productId',
  auth(),
  validateId('productId'),
  controller.remove,
);

/**
 * @openapi
 * /api/v1/products/{slug}:
 *   get:
 *     summary: Get public product details by slug
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ProductSummary'
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// MUST BE LAST
router.get(
  '/:slug',
  cacheRead({ key: (req) => keys.catalog.product(req.params.slug), ttl: 600 }),
  controller.getBySlug,
);

module.exports = router;
