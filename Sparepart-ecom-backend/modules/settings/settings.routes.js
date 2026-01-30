const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./settings.controller');

const router = express.Router();

// Public settings (branding, etc.)
router.get('/public', controller.listPublic);
// Admin Only - Settings are critical
router.get('/', auth([ROLES.ADMIN]), controller.list);
router.put('/', auth([ROLES.ADMIN]), controller.updateBulk);

module.exports = router;
