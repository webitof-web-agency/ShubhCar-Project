const express = require('express');
const controller = require('./cart.controller');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const validateId = require('../../middlewares/objectId.middleware');
const {
  addItemSchema,
  updateQtySchema,
  applyCouponSchema,
} = require('./cart.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/cart:
 *   get:
 *     summary: Get current user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active cart with items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *                 success:
 *                   type: boolean
 */
router.get('/', auth(), controller.getCart);
router.post('/summary', auth(), controller.getSummary);
router.post('/summary/guest', controller.getGuestSummary);

/**
 * @openapi
 * /api/v1/cart/items:
 *   post:
 *     summary: Add an item to the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *             required: [productId, quantity]
 *     responses:
 *       200:
 *         description: Item added to cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *                 success:
 *                   type: boolean
 */
router.post('/items', auth(), validate(addItemSchema), controller.addItem);
router.patch(
  '/items/:itemId',
  auth(),
  validateId('itemId'),
  validate(updateQtySchema),
  controller.updateQuantity,
);

/**
 * @openapi
 * /api/v1/cart/items/{itemId}:
 *   patch:
 *     summary: Update quantity of a cart item
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *             required: [quantity]
 *     responses:
 *       200:
 *         description: Updated cart item quantity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *                 success:
 *                   type: boolean
 */
router.delete(
  '/items/:itemId',
  auth(),
  validateId('itemId'),
  controller.removeItem,
);

/**
 * @openapi
 * /api/v1/cart/items/{itemId}:
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *                 success:
 *                   type: boolean
 */
router.post(
  '/coupon',
  auth(),
  validate(applyCouponSchema),
  controller.applyCoupon,
);

/**
 * @openapi
 * /api/v1/cart/coupon:
 *   post:
 *     summary: Apply a coupon code to the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *             required: [code]
 *     responses:
 *       200:
 *         description: Coupon applied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *                 success:
 *                   type: boolean
 */
router.delete('/coupon', auth(), controller.removeCoupon);

/**
 * @openapi
 * /api/v1/cart/coupon:
 *   delete:
 *     summary: Remove the applied coupon from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *                 success:
 *                   type: boolean
 */

module.exports = router;
