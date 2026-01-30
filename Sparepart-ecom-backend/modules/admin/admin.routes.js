const express = require('express');
const controller = require('./admin.controller');
const auth = require('../../middlewares/auth.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const ROLES = require('../../constants/roles');

const router = express.Router();

/**
 * @openapi
 * /api/v1/admin/wholesale/pending:
 *   get:
 *     summary: List pending wholesale user verifications
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                 success:
 *                   type: boolean
 */
router.get(
  '/wholesale/pending',
  adminLimiter,
  auth([ROLES.ADMIN]),
  controller.listPendingWholesale,
);

/**
 * @openapi
 * /api/v1/admin/wholesale/{userId}/review:
 *   post:
 *     summary: Approve or reject a wholesale application
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               reason:
 *                 type: string
 *             required: [action]
 *     responses:
 *       200:
 *         description: Application reviewed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 */
router.post(
  '/wholesale/:userId/review',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('userId'),
  controller.reviewWholesaleUser,
);

module.exports = router;
