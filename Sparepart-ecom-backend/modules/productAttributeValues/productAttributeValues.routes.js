const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const controller = require('./productAttributeValues.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createSchema, updateSchema } = require('./productAttributeValues.validator');
const ROLES = require('../../constants/roles');

const router = express.Router();

router.get('/', adminLimiter, auth([ROLES.ADMIN]), controller.list);
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.get);
router.post('/', adminLimiter, auth([ROLES.ADMIN]), validate(createSchema), controller.create);
router.put('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), validate(updateSchema), controller.update);
router.delete('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.remove);

module.exports = router;
