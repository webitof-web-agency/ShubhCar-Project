const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const controller = require('./userAddresses.controller');
const validateId = require('../../middlewares/objectId.middleware');
const ROLES = require('../../constants/roles');

const router = express.Router();

router.get('/', auth(), controller.list);
router.get('/admin/:userId', auth([ROLES.ADMIN]), validateId('userId'), controller.adminListByUser);
router.get('/:id', auth(), validateId('id'), controller.get);
router.post('/', auth(), controller.create);
router.put('/:id', auth(), validateId('id'), controller.update);
router.delete('/:id', auth(), validateId('id'), controller.remove);

module.exports = router;
