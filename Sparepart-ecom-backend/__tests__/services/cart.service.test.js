/**
 * Cart service tests cover validation, stock checks, cache behaviour, and coupon application.
 */
jest.mock('../../modules/cart/cart.repo', () => ({
  getOrCreateCart: jest.fn(),
  addItem: jest.fn(),
  updateQty: jest.fn(),
  removeItem: jest.fn(),
  getItemById: jest.fn(),
  getCartWithItems: jest.fn(),
}));
jest.mock('../../modules/cart/cart.cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  clear: jest.fn(),
  saveCart: jest.fn(),
  getCart: jest.fn(),
}));
jest.mock('../../cache/inventory.cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));
jest.mock('../../modules/productVariants/productVariant.repo', () => ({
  getVariantById: jest.fn(),
}));
jest.mock('../../modules/coupons/coupons.service', () => ({
  validate: jest.fn(),
}));
jest.mock('../../models/Product.model', () => ({
  findById: jest.fn(() => ({ lean: () => null })),
}));
jest.mock('../../models/Cart.model', () => ({
  findByIdAndUpdate: jest.fn(),
}));

const cartService = require('../../modules/cart/cart.service');
const cartRepo = require('../../modules/cart/cart.repo');
const cartCache = require('../../modules/cart/cart.cache');
const inventoryCache = require('../../cache/inventory.cache');
const variantRepo = require('../../modules/productVariants/productVariant.repo');
const couponService = require('../../modules/coupons/coupons.service');
const Product = require('../../models/Product.model');
const Cart = require('../../models/Cart.model');
const { AppError } = require('../../utils/apiResponse');

const user = { id: 'user1', customerType: 'retail', verificationStatus: 'approved' };

describe('CartService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cartCache.get.mockResolvedValue(null);
    cartRepo.getOrCreateCart.mockResolvedValue({ _id: 'cart1', couponId: null, couponCode: null, discountAmount: 0 });
  });

  describe('loadVariant caching', () => {
    it('returns cached variant when available', async () => {
      inventoryCache.get.mockResolvedValue({ _id: 'v1' });
      const v = await cartService.loadVariant('v1');
      expect(v._id).toBe('v1');
      expect(variantRepo.getVariantById).not.toHaveBeenCalled();
    });

    it('fetches variant and caches when not in cache', async () => {
      inventoryCache.get.mockResolvedValue(null);
      variantRepo.getVariantById.mockResolvedValue({ _id: 'v2', status: 'active' });
      const v = await cartService.loadVariant('v2');
      expect(inventoryCache.set).toHaveBeenCalledWith('v2', v);
      expect(v._id).toBe('v2');
    });
  });

  describe('addItem', () => {
    const activeVariant = {
      _id: 'v1',
      productId: 'p1',
      status: 'active',
      stockQty: 5,
      sku: 'SKU1',
      price: 100,
    };

    beforeEach(() => {
      inventoryCache.get.mockResolvedValue(null);
      variantRepo.getVariantById.mockResolvedValue(activeVariant);
      Product.findById.mockReturnValue({ lean: () => ({ _id: 'p1', status: 'active' }) });
    });

    it('rejects when variant unavailable or stock insufficient', async () => {
      variantRepo.getVariantById.mockResolvedValue({ status: 'inactive' });
      await expect(
        cartService.addItem({ user, sessionId: 's', productVariantId: 'v', quantity: 1 }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it('adds item, clears cache, and returns fresh cart', async () => {
      cartRepo.getCartWithItems.mockResolvedValue([{ productVariantId: 'v1', quantity: 1, priceAtTime: 100 }]);
      const payload = await cartService.addItem({
        user,
        sessionId: 'sess',
        productVariantId: 'v1',
        quantity: 2,
      });

      expect(cartRepo.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          cartId: 'cart1',
          item: expect.objectContaining({ quantity: 2, priceType: 'retail' }),
        }),
      );
      expect(cartCache.clear).toHaveBeenCalledWith({ userId: user.id, sessionId: 'sess' });
      expect(payload.items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('errors when cart item missing', async () => {
      cartRepo.getItemById.mockResolvedValue(null);
      await expect(
        cartService.updateQuantity({ user, sessionId: 's', itemId: 'i1', quantity: 2 }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it('updates qty after stock check and clears cache', async () => {
      cartRepo.getItemById.mockResolvedValue({ _id: 'i1', productVariantId: 'v1' });
      inventoryCache.get.mockResolvedValue({ _id: 'v1', status: 'active', stockQty: 10 });
      cartRepo.getCartWithItems.mockResolvedValue([]);

      const res = await cartService.updateQuantity({
        user,
        sessionId: 's',
        itemId: 'i1',
        quantity: 3,
      });

      expect(cartRepo.updateQty).toHaveBeenCalledWith({
        cartId: 'cart1',
        itemId: 'i1',
        quantity: 3,
      });
      expect(cartCache.clear).toHaveBeenCalledWith({ userId: user.id, sessionId: 's' });
      expect(res.items).toEqual([]);
    });
  });

  describe('removeItem', () => {
    it('removes item and returns updated cart', async () => {
      cartRepo.getCartWithItems.mockResolvedValue([]);
      const res = await cartService.removeItem({ user, sessionId: 's', itemId: 'i1' });
      expect(cartRepo.removeItem).toHaveBeenCalledWith({ cartId: 'cart1', itemId: 'i1' });
      expect(cartCache.clear).toHaveBeenCalled();
      expect(res.items).toEqual([]);
    });
  });

  describe('getCart', () => {
    it('returns cached cart when present', async () => {
      cartCache.get.mockResolvedValue({ cartId: 'cached', items: [] });
      const res = await cartService.getCart({ user, sessionId: 's' });
      expect(res.cartId).toBe('cached');
      expect(cartRepo.getCartWithItems).not.toHaveBeenCalled();
    });

    it('hydrates cart and caches when not cached', async () => {
      cartCache.get.mockResolvedValue(null);
      cartRepo.getCartWithItems.mockResolvedValue([{ productVariantId: 'v1', quantity: 1, priceAtTime: 10 }]);
      const res = await cartService.getCart({ user, sessionId: 's' });
      expect(cartRepo.getCartWithItems).toHaveBeenCalledWith('cart1');
      expect(cartCache.set).toHaveBeenCalled();
      expect(res.items).toHaveLength(1);
    });
  });

  describe('coupon flows', () => {
    it('rejects applying coupon on empty cart', async () => {
      cartRepo.getCartWithItems.mockResolvedValue([]);
      await expect(
        cartService.applyCoupon({ user, sessionId: 's', code: 'OFF10' }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it('applies coupon, updates cart, and clears cache', async () => {
      cartRepo.getCartWithItems.mockResolvedValue([
        { productVariantId: 'v1', quantity: 2, priceAtTime: 50 },
      ]);
      couponService.validate.mockResolvedValue({ couponId: 'c1', couponCode: 'OFF10', discountAmount: 10 });
      cartRepo.getCartWithItems.mockResolvedValueOnce([
        { productVariantId: 'v1', quantity: 2, priceAtTime: 50 },
      ]);
      cartRepo.getCartWithItems.mockResolvedValueOnce([
        { productVariantId: 'v1', quantity: 2, priceAtTime: 50 },
      ]);

      await cartService.applyCoupon({ user, sessionId: 's', code: 'OFF10' });

      expect(couponService.validate).toHaveBeenCalledWith({
        code: 'OFF10',
        userId: user.id,
        orderAmount: 100,
      });
      expect(Cart.findByIdAndUpdate).toHaveBeenCalledWith('cart1', {
        couponId: 'c1',
        couponCode: 'OFF10',
        discountAmount: 10,
      });
      expect(cartCache.clear).toHaveBeenCalledWith({ userId: user.id, sessionId: 's' });
    });

    it('removes coupon and clears cache', async () => {
      cartRepo.getCartWithItems.mockResolvedValue([]);
      await cartService.removeCoupon({ user, sessionId: 's' });
      expect(Cart.findByIdAndUpdate).toHaveBeenCalledWith('cart1', {
        couponId: null,
        couponCode: null,
        discountAmount: 0,
      });
      expect(cartCache.clear).toHaveBeenCalled();
    });
  });
});
