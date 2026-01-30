const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const ROLES = require('../../constants/roles');
const controller = require('./tax.controller');
const validateId = require('../../middlewares/objectId.middleware');

const router = express.Router();

router.get('/slabs', auth([ROLES.ADMIN]), controller.list);
router.post('/slabs', auth([ROLES.ADMIN]), controller.create);
router.put('/slabs/:id', auth([ROLES.ADMIN]), validateId('id'), controller.update);
router.delete('/slabs/:id', auth([ROLES.ADMIN]), validateId('id'), controller.remove);

module.exports = router;
