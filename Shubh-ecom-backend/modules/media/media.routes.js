const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./media.controller');
const ROLES = require('../../constants/roles');
const { uploadMedia } = require('../../middlewares/mediaUpload.middleware');
const {
  presignSchema,
  createMediaSchema,
  listMediaQuerySchema,
} = require('./media.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/media/presign:
 *   post:
 *     summary: Get S3 presigned POST
 *     tags: [Media]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileName: { type: string }
 *               fileType: { type: string }
 *             required: [fileName, fileType]
 *     responses:
 *       200: { description: Presign data }
 */
router.post(
  '/presign',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(presignSchema),
  controller.presign,
);

/**
 * @openapi
 * /api/v1/media/upload:
 *   post:
 *     summary: Upload media (multipart)
 *     tags: [Media]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       201: { description: Uploaded media }
 */
router.post('/upload', adminLimiter, auth([ROLES.ADMIN]), uploadMedia.array('files', 10), controller.upload);

/**
 * @openapi
 * /api/v1/media:
 *   post:
 *     summary: Create media record
 *     tags: [Media]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url: { type: string, format: uri }
 *               key: { type: string }
 *               mimeType: { type: string }
 *               size: { type: integer }
 *             required: [url, key, mimeType, size]
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(createMediaSchema),
  controller.create,
);

/**
 * @openapi
 * /api/v1/media:
 *   get:
 *     summary: List media
 *     tags: [Media]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Media list }
 */
router.get(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(listMediaQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/media/{id}:
 *   get:
 *     summary: Get media by id
 *     tags: [Media]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Media }
 */
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/media/{id}:
 *   delete:
 *     summary: Delete media
 *     tags: [Media]
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
