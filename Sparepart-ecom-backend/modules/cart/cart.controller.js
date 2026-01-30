const asyncHandler = require('../../utils/asyncHandler');
const cartService = require('./cart.service');
const { success } = require('../../utils/apiResponse');

exports.getCart = asyncHandler(async (req, res) => {
  const data = await cartService.getCart({
    user: req.user,
    sessionId: req.headers['x-session-id'],
  });
  return success(res, data);
});

exports.getSummary = asyncHandler(async (req, res) => {
  const data = await cartService.getSummary({
    user: req.user,
    sessionId: req.headers['x-session-id'],
    shippingAddressId: req.body?.shippingAddressId || null,
  });
  return success(res, data, 'Cart summary');
});

exports.getGuestSummary = asyncHandler(async (req, res) => {
  const data = await cartService.getGuestSummary({
    items: req.body?.items || [],
    shippingAddress: req.body?.shippingAddress || null,
    couponCode: req.body?.couponCode || null,
  });
  return success(res, data, 'Cart summary');
});

exports.addItem = asyncHandler(async (req, res) => {
  const data = await cartService.addItem({
    user: req.user,
    sessionId: req.headers['x-session-id'],
    ...req.body,
  });
  return success(res, data, 'Item added to cart');
});

exports.removeItem = asyncHandler(async (req, res) => {
  const data = await cartService.removeItem({
    user: req.user,
    sessionId: req.headers['x-session-id'],
    itemId: req.params.itemId,
  });
  return success(res, data, 'Item removed');
});

exports.updateQuantity = asyncHandler(async (req, res) => {
  const data = await cartService.updateQuantity({
    user: req.user,
    sessionId: req.headers['x-session-id'],
    itemId: req.params.itemId,
    ...req.body,
  });
  return success(res, data, 'Quantity updated');
});

exports.applyCoupon = asyncHandler(async (req, res) => {
  const data = await cartService.applyCoupon({
    user: req.user,
    sessionId: req.sessionId,
    code: req.body.code,
  });
  return success(res, data, 'Coupon applied');
});

exports.removeCoupon = asyncHandler(async (req, res) => {
  const data = await cartService.removeCoupon({
    user: req.user,
    sessionId: req.sessionId,
  });
  return success(res, data, 'Coupon removed');
});
