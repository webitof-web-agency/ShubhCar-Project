const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./roles.controller');

const router = express.Router();

router.get('/', auth(), authorize([ROLES.ADMIN]), controller.list);
router.post('/', auth(), authorize([ROLES.ADMIN]), controller.create);
router.get('/:roleId', auth(), authorize([ROLES.ADMIN]), controller.get);
router.put('/:roleId', auth(), authorize([ROLES.ADMIN]), controller.update);
router.delete('/:roleId', auth(), authorize([ROLES.ADMIN]), controller.remove);

module.exports = router;
