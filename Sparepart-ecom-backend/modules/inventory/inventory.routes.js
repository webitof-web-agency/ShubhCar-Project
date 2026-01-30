const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./inventory.controller');

const router = express.Router();

router.get('/summary', adminLimiter, auth([ROLES.ADMIN]), controller.summary);
router.get('/products', adminLimiter, auth([ROLES.ADMIN]), controller.listProducts);
router.post('/adjust', adminLimiter, auth([ROLES.ADMIN]), controller.adjustStock);

module.exports = router;
