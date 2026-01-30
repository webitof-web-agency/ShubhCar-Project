const cartCache = require('./cart.cache');
const cartRepo = require('./cart.repo');
const { addItemSchema, updateQtySchema } = require('./cart.validator');
const Product = require('../../models/Product.model');
const ProductImage = require('../../models/ProductImage.model');
const { error } = require('../../utils/apiResponse');
const couponService = require('../coupons/coupons.service');
const Cart = require('../../models/Cart.model');
const pricingService = require('../../services/pricing.service');
const checkoutTotals = require('../../services/checkoutTotals.service');
const addressRepo = require('../users/userAddress.repo');
class CartService {
  async addItem({ user, sessionId, productId, quantity }) {
    const { error: err } = addItemSchema.validate({
      productId,
      quantity,
    });
    if (err) error(err.details[0].message);

    const product = await Product.findById(productId).lean();
    if (!product || product.status !== 'active')
      error('Product unavailable', 404);

    if (quantity > (product.stockQty || 0)) error('Insufficient stock', 400);

    const isWholesale =
      user.customerType === 'wholesale' &&
      user.verificationStatus === 'approved';

    const priceType = isWholesale ? 'wholesale' : 'retail';
    const priceAtTime = pricingService.resolveUnitPrice({
      product,
      customerType: priceType,
    });
    if (!priceAtTime) error('Product pricing unavailable', 400);

    const cart = await cartRepo.getOrCreateCart({ userId: user.id, sessionId });
    const sku =
      product.sku ||
      product.productId ||
      `PRO-${String(product._id).slice(-6).toUpperCase()}`;

    await cartRepo.addItem({
      cartId: cart._id,
      item: {
        productId: product._id,
        sku,
        quantity,
        priceType,
        priceAtTime,
      },
    });

    await cartCache.clear({ userId: user.id, sessionId });
    return this.getCart({ user, sessionId });
  }

  async updateQuantity({ user, sessionId, itemId, quantity }) {
    const { error: err } = updateQtySchema.validate({ quantity });
    if (err) error(err.details[0].message);

    const cart = await cartRepo.getOrCreateCart({ userId: user.id, sessionId });
    const existing = await cartRepo.getItemById({ cartId: cart._id, itemId });
    if (!existing) error('Cart item not found', 404);

    const product = await Product.findById(existing.productId).lean();
    if (!product || product.status !== 'active')
      error('Product unavailable', 404);
    if (quantity > (product.stockQty || 0)) error('Insufficient stock', 400);
    const priceType =
      user.customerType === 'wholesale' &&
      user.verificationStatus === 'approved'
        ? 'wholesale'
        : 'retail';
    const priceAtTime = pricingService.resolveUnitPrice({
      product,
      customerType: priceType,
    });

    await cartRepo.updateQty({ cartId: cart._id, itemId, quantity, priceAtTime });

    await cartCache.clear({ userId: user.id, sessionId });
    return this.getCart({ user, sessionId });
  }

  async removeItem({ user, sessionId, itemId }) {
    const cart = await cartRepo.getOrCreateCart({ userId: user.id, sessionId });
    await cartRepo.removeItem({ cartId: cart._id, itemId });
    await cartCache.clear({ userId: user.id, sessionId });
    return this.getCart({ user, sessionId });
  }

  async getCart({ user, sessionId }) {
    const cached = await cartCache.get({ userId: user.id, sessionId });
    if (cached) return cached;

    const cart = await cartRepo.getOrCreateCart({ userId: user.id, sessionId });
    const items = await cartRepo.getCartWithItems(cart._id);
    const enrichedItems = await this.enrichItems(items);
    const payload = {
      cartId: cart._id,
      items: enrichedItems,
      couponId: cart.couponId || null,
      couponCode: cart.couponCode || null,
      discountAmount: cart.discountAmount || 0,
      updatedAt: cart.updatedAt,
    };
    await cartCache.set({ userId: user.id, sessionId }, payload);
    return payload;
  }

  async getSummary({ user, sessionId, shippingAddressId } = {}) {
    const cart = await cartRepo.getOrCreateCart({ userId: user.id, sessionId });
    const items = await cartRepo.getCartWithItems(cart._id);
    if (!items.length) error('Cart is empty', 400);

    const enrichedItems = await this.enrichItems(items);

    let shippingAddress = null;
    if (shippingAddressId) {
      const address = await addressRepo.findById(shippingAddressId);
      if (!address || String(address.userId) !== String(user.id)) {
        error('Invalid shipping address', 400);
      }
      shippingAddress = address;
    }

    const calcItems = enrichedItems.map((item) => {
      const product = item.product || {};
      return {
        productId: product._id || item.productId,
        quantity: item.quantity,
        price: item.priceAtTime,
        hsnCode: product.hsnCode,
        taxSlabs: product.taxSlabs || [],
        taxRate: product.taxRate,
        taxClassKey: product.taxClassKey,
        weight: product.weight || 0,
        length: product.length || 0,
        width: product.width || 0,
        height: product.height || 0,
        isHeavy: Boolean(product.isHeavy),
        isFragile: Boolean(product.isFragile),
      };
    });

    const totals = await checkoutTotals.calculateTotals({
      items: calcItems,
      shippingAddress,
      paymentMethod: null,
      couponCode: cart.couponCode || null,
      userId: user.id,
    });

    return {
      cartId: cart._id,
      items: enrichedItems,
      couponCode: totals.coupon?.couponCode || null,
      discountAmount: totals.discountAmount || 0,
      subtotal: totals.subtotal,
      taxableAmount: totals.taxableAmount,
      taxAmount: totals.taxAmount,
      taxBreakdown: totals.taxBreakdown,
      shippingFee: totals.shippingFee,
      grandTotal: totals.grandTotal,
      settings: totals.settings,
    };
  }

  async getGuestSummary({ items = [], shippingAddress = null, couponCode = null } = {}) {
    if (!Array.isArray(items) || !items.length) {
      error('Cart is empty', 400);
    }

    const calcItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity || 0);
      if (!quantity) continue;

      const product = item.productId
        ? await Product.findById(item.productId).lean()
        : null;

      if (!product || product.status !== 'active') continue;

      const unitPrice = pricingService.resolveUnitPrice({
        product,
        customerType: 'retail',
      });

      calcItems.push({
        productId: product._id,
        quantity,
        price: unitPrice,
        hsnCode: product.hsnCode || null,
        taxSlabs: product.taxSlabs || [],
        taxRate: product.taxRate,
        taxClassKey: product.taxClassKey,
        weight: product.weight || 0,
        length: product.length || 0,
        width: product.width || 0,
        height: product.height || 0,
        isHeavy: Boolean(product.isHeavy),
        isFragile: Boolean(product.isFragile),
      });
    }

    if (!calcItems.length) {
      error('Cart is empty', 400);
    }

    const totals = await checkoutTotals.calculateTotals({
      items: calcItems,
      shippingAddress,
      paymentMethod: null,
      couponCode,
      userId: null,
    });

    return {
      items: calcItems,
      couponCode: totals.coupon?.couponCode || null,
      discountAmount: totals.discountAmount || 0,
      subtotal: totals.subtotal,
      taxableAmount: totals.taxableAmount,
      taxAmount: totals.taxAmount,
      taxBreakdown: totals.taxBreakdown,
      shippingFee: totals.shippingFee,
      grandTotal: totals.grandTotal,
      settings: totals.settings,
    };
  }

  async enrichItems(items = []) {
    if (!items.length) return [];
    const productIds = items.map((i) => i.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const images = await ProductImage.find({ productId: { $in: productIds }, isDeleted: false })
      .sort({ isPrimary: -1, sortOrder: 1 })
      .lean();
    const imageMap = new Map();
    images.forEach((img) => {
      const key = String(img.productId);
      if (!imageMap.has(key)) {
        imageMap.set(key, []);
      }
      imageMap.get(key).push({ url: img.url, altText: img.altText });
    });

    return items.map((item) => {
      const product = productMap.get(String(item.productId));
      const productImages = product ? imageMap.get(String(product._id)) || [] : [];
      return {
        ...item,
        product: product ? { ...product, images: productImages } : null,
      };
    });
  }

  async clearCart({ user, sessionId }) {
    await cartCache.clear({ userId: user.id, sessionId });
  }

  async applyCoupon({ user, sessionId, code }) {
    const cart = await cartRepo.getOrCreateCart({
      userId: user.id,
      sessionId,
    });

    const items = await cartRepo.getCartWithItems(cart._id);
    if (!items.length) error('Cart is empty', 400);

    const subtotal = items.reduce(
      (sum, i) => sum + i.priceAtTime * i.quantity,
      0,
    );

    const result = await couponService.validate({
      code,
      userId: user.id,
      orderAmount: subtotal,
    });

    await Cart.findByIdAndUpdate(cart._id, result);

    await cartCache.clear({ userId: user.id, sessionId });
    return this.getCart({ user, sessionId });
  }

  async removeCoupon({ user, sessionId }) {
    const cart = await cartRepo.getOrCreateCart({
      userId: user.id,
      sessionId,
    });

    await Cart.findByIdAndUpdate(cart._id, {
      couponId: null,
      couponCode: null,
      discountAmount: 0,
    });

    await cartCache.clear({ userId: user.id, sessionId });
    return this.getCart({ user, sessionId });
  }
}

module.exports = new CartService();
