const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./models.controller');

const router = express.Router();

// Public
router.get('/', controller.list);
router.get('/:id', controller.get);

// Admin
router.post('/', auth([ROLES.ADMIN]), controller.create);
router.put('/:id', auth([ROLES.ADMIN]), controller.update);
router.delete('/:id', auth([ROLES.ADMIN]), controller.remove);

module.exports = router;
