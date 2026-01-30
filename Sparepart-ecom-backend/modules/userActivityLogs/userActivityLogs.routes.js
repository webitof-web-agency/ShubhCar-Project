const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const controller = require('./userActivityLogs.controller');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');

const router = express.Router();

router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.list);

module.exports = router;
