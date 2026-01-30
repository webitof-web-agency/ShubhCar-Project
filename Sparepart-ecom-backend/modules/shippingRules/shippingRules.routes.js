const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./shippingRules.controller');
const validateId = require('../../middlewares/objectId.middleware');

const router = express.Router();

router.get('/', auth([ROLES.ADMIN]), controller.list);
router.post('/', auth([ROLES.ADMIN]), controller.create);
router.put('/:id', auth([ROLES.ADMIN]), validateId('id'), controller.update);
router.delete('/:id', auth([ROLES.ADMIN]), validateId('id'), controller.remove);

module.exports = router;
