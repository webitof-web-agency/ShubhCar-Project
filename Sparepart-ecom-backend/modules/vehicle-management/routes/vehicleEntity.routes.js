const express = require('express');
const auth = require('../../../middlewares/auth.middleware');
const ROLES = require('../../../constants/roles');
const controller = require('../controllers/vehicle.controller');
const validateId = require('../../../middlewares/objectId.middleware');

const router = express.Router();

router.get('/', controller.list);
router.get('/export', auth([ROLES.ADMIN]), controller.export);
router.get('/filters/years', controller.availableYears);
router.get('/filters/attributes', controller.availableAttributes);
router.post('/', auth([ROLES.ADMIN]), controller.create);
router.get('/:id/detail', validateId('id'), controller.detail);
router.get('/:id', validateId('id'), controller.get);
router.put('/:id', auth([ROLES.ADMIN]), validateId('id'), controller.update);
router.delete('/:id', auth([ROLES.ADMIN]), validateId('id'), controller.remove);

module.exports = router;
