const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./media.controller');
const ROLES = require('../../constants/roles');
const { uploadMedia } = require('../../middlewares/mediaUpload.middleware');

const router = express.Router();

router.post('/presign', adminLimiter, auth([ROLES.ADMIN]), controller.presign);
router.post(
  '/upload',
  adminLimiter,
  auth([ROLES.ADMIN]),
  uploadMedia.array('files', 10),
  controller.upload,
);
router.post('/', adminLimiter, auth([ROLES.ADMIN]), controller.create);
router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.list);
router.get(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  controller.get,
);
router.delete(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  controller.remove,
);

module.exports = router;
