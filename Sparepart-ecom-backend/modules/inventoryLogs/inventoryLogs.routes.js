const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const controller = require('./inventoryLogs.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');

const router = express.Router();

router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.list);
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.get);

module.exports = router;
