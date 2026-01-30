const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const controller = require('./notifications.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const validate = require('../../middlewares/validate.middleware');
const ROLES = require('../../constants/roles');
const {
  createNotificationSchema,
  updateNotificationSchema,
  markAllSchema,
} = require('./notifications.validator');

const router = express.Router();

// Users can list/get their own; admin full CRUD
router.get('/', auth(), controller.list);
router.get('/summary', auth(), controller.summary);
router.get('/:id', auth(), validateId('id'), controller.get);
router.post(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(createNotificationSchema),
  controller.create,
);
router.put(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(updateNotificationSchema),
  controller.update,
);
router.delete('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.remove);
router.post('/:id/read', auth(), validateId('id'), controller.markRead);
router.post('/mark-all-read', auth(), validate(markAllSchema), controller.markAllRead);

module.exports = router;
