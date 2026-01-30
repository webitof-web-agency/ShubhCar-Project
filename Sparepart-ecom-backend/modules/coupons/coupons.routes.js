const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const controller = require('./coupons.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');

const router = express.Router();

router.get('/public', controller.listPublic);
router.post('/preview', auth(), controller.preview);
router.get('/usage/list', adminLimiter, auth([ROLES.ADMIN]), controller.listUsage);
router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.list);
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.get);
router.post('/', adminLimiter, auth([ROLES.ADMIN]), controller.create);
router.put('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.update);
router.delete('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.remove);

module.exports = router;
