const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./entries.controller');

const router = express.Router();

// Public - Contact Form Submission
router.post('/', controller.create);

// Admin - Manage Entries
router.get('/stats', auth([ROLES.ADMIN]), controller.stats);
router.get('/', auth([ROLES.ADMIN]), controller.list);
router.get('/:id', auth([ROLES.ADMIN]), controller.get);
router.delete('/:id', auth([ROLES.ADMIN]), controller.remove);
router.patch('/:id/read', auth([ROLES.ADMIN]), controller.markRead);

module.exports = router;
