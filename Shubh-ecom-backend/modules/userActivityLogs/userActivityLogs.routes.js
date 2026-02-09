const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./userActivityLogs.controller');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');
const { listUserActivityLogsQuerySchema } = require('./userActivityLogs.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/user-activity-logs:
 *   get:
 *     summary: List user activity logs
 *     tags: [Audit]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Activity logs }
 */
router.get(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(listUserActivityLogsQuerySchema, 'query'),
  controller.list,
);

module.exports = router;
