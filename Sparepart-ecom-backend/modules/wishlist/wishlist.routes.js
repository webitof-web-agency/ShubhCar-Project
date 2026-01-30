const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const controller = require('./wishlist.controller');
const { addSchema } = require('./wishlist.validator');

const router = express.Router();

router.get('/', auth(), controller.list);
router.post('/', auth(), validate(addSchema), controller.add);
router.delete('/:productId', auth(), validateId('productId'), controller.remove);

module.exports = router;
