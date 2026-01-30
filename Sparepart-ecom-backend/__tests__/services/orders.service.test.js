/**
 * Order service is high-risk: it locks inventory, applies coupons, and kicks off
 * async jobs. These tests ensure we don't over-sell stock or double-use coupons.
 */
jest.mock('../../modules/cart/cart.repo', () => ({
  getOrCreateCart: jest.fn(),
  getCartWithItems: jest.fn(),
}));
jest.mock('../../modules/cart/cart.cache', () => ({
  clearCart: jest.fn(),
}));
jest.mock('../../modules/products/product.repo', () => ({
  findById: jest.fn(),
}));
jest.mock('../../modules/productVariants/productVariant.repo', () => ({
  getVariantById: jest.fn(),
}));
jest.mock('../../modules/vendors/vendor.repo', () => ({
  findById: jest.fn(),
}));
jest.mock('../../modules/users/userAddress.repo', () => ({
  findById: jest.fn(),
}));
jest.mock('../../modules/coupons/coupon.repo', () => ({
  lockCoupon: jest.fn(),
  unlockCoupon: jest.fn(),
  recordUsage: jest.fn(),
  removeUsageByOrder: jest.fn(),
}));
jest.mock('../../modules/coupons/coupons.service', () => ({
  preview: jest.fn(),
}));
jest.mock('../../modules/payments/payment.repo', () => ({}));
jest.mock('../../modules/inventory/inventory.service', () => ({
  reserve: jest.fn(),
  release: jest.fn(),
}));
jest.mock('../../modules/orders/order.repo', () => ({
  createOrder: jest.fn(),
  createItems: jest.fn(),
  findById: jest.fn(),
  findItemsByOrder: jest.fn(),
}));
jest.mock('../../modules/orders/orderVersion.repo', () => ({}));
jest.mock('../../modules/orders/orderEvent.repo', () => ({}));
jest.mock('../../jobs/order.jobs', () => ({
  scheduleAutoCancel: jest.fn(),
}));
jest.mock('../../services/shipping.service', () => ({
  calculate: jest.fn(),
}));
jest.mock('../../services/tax.service', () => ({
  calculateGST: jest.fn(),
}));
jest.mock('../../modules/invoice/invoice.service', () => ({
  generateFromOrder: jest.fn(),
}));
jest.mock('../../modules/shipments/shipment.repo', () => ({}));
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
}));

const mongoose = require('mongoose');
const orderService = require('../../modules/orders/orders.service');
const cartRepo = require('../../modules/cart/cart.repo');
const cartCache = require('../../modules/cart/cart.cache');
const productRepo = require('../../modules/products/product.repo');
const variantRepo = require('../../modules/productVariants/productVariant.repo');
const vendorRepo = require('../../modules/vendors/vendor.repo');
const addressRepo = require('../../modules/users/userAddress.repo');
const couponRepo = require('../../modules/coupons/coupon.repo');
const couponService = require('../../modules/coupons/coupons.service');
const inventoryService = require('../../modules/inventory/inventory.service');
const orderRepo = require('../../modules/orders/order.repo');
const orderJobs = require('../../jobs/order.jobs');
const shippingService = require('../../services/shipping.service');
const taxService = require('../../services/tax.service');
const { AppError } = require('../../utils/apiResponse');

const mockSession = () => {
  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };
  mongoose.startSession.mockResolvedValue(session);
  return session;
};

describe('OrderService.placeOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reserves stock, locks coupon, and schedules auto-cancel to avoid overselling', async () => {
    const session = mockSession();
    cartRepo.getOrCreateCart.mockResolvedValue({
      _id: 'cart1',
      couponId: 'coupon1',
      couponCode: 'SAVE10',
      discountAmount: 20,
    });
    cartRepo.getCartWithItems.mockResolvedValue([
      { _id: 'ci1', productVariantId: 'variant1', quantity: 2 },
    ]);
    addressRepo.findById.mockResolvedValue({ _id: 'addr', userId: 'user1', state: 'KA' });
    variantRepo.getVariantById.mockResolvedValue({
      _id: 'variant1',
      productId: 'product1',
      status: 'active',
      price: 100,
    });
    productRepo.findById.mockResolvedValue({
      _id: 'product1',
      vendorId: 'vendor1',
      status: 'active',
      hsnCode: '8708',
    });
    vendorRepo.findById.mockResolvedValue({ _id: 'vendor1', status: 'active' });
    shippingService.calculate.mockReturnValue(50);
    couponRepo.lockCoupon.mockResolvedValue(true);
    taxService.calculateGST.mockReturnValue({
      total: 20,
      ratePercent: 10,
      components: { cgst: 10, sgst: 10, igst: 0 },
    });
    couponService.preview.mockResolvedValue({
      couponId: 'coupon1',
      code: 'SAVE10',
      discountAmount: 20,
    });
    orderRepo.createOrder.mockResolvedValue([{ _id: 'order1' }]);
    orderRepo.createItems.mockResolvedValue();

    const order = await orderService.placeOrder({
      user: { id: 'user1' },
      sessionId: 'sess-1',
      payload: {
        shippingAddressId: 'addr',
        billingAddressId: 'addr',
        paymentMethod: 'razorpay',
        taxPercent: 10,
      },
    });

    expect(shippingService.calculate).toHaveBeenCalledWith({ subtotal: 200 });
    expect(taxService.calculateGST).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 180,
        destinationState: 'KA',
        hsnCode: '8708',
      }),
    );
    expect(couponRepo.lockCoupon).toHaveBeenCalledWith(
      expect.objectContaining({
        couponId: 'coupon1',
        userId: 'user1',
        sessionId: 'sess-1',
        scope: 'coupon',
      }),
    );
    expect(couponService.preview).toHaveBeenCalledWith({
      userId: 'user1',
      code: 'SAVE10',
      orderSubtotal: 200,
      session,
    });
    expect(orderRepo.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: 200,
        discountAmount: 20,
        taxAmount: 20,
        shippingFee: 50,
        grandTotal: 250,
        paymentMethod: 'razorpay',
        couponId: 'coupon1',
      }),
      session,
    );
    expect(inventoryService.reserve).toHaveBeenCalledWith(
      'variant1',
      2,
      session,
      expect.objectContaining({ userId: 'user1' }),
    );
    expect(couponRepo.recordUsage).toHaveBeenCalledWith(
      {
        couponId: 'coupon1',
        userId: 'user1',
        orderId: 'order1',
      },
      session,
    );
    expect(cartCache.clearCart).toHaveBeenCalledWith('user1', 'sess-1');
    expect(orderJobs.scheduleAutoCancel).toHaveBeenCalledWith('order1');
    expect(order._id).toBe('order1');
  });

  it('rejects payment initiation when coupon lock fails (prevents double use)', async () => {
    mockSession();
    cartRepo.getOrCreateCart.mockResolvedValue({
      _id: 'cart1',
      couponId: 'coupon1',
      couponCode: 'SAVE10',
    });
    cartRepo.getCartWithItems.mockResolvedValue([
      { _id: 'ci1', productVariantId: 'variant1', quantity: 1 },
    ]);
    addressRepo.findById.mockResolvedValue({ _id: 'addr', userId: 'user1', state: 'KA' });
    variantRepo.getVariantById.mockResolvedValue({
      _id: 'variant1',
      productId: 'product1',
      status: 'active',
      price: 50,
    });
    productRepo.findById.mockResolvedValue({
      _id: 'product1',
      vendorId: 'vendor1',
      status: 'active',
    });
    vendorRepo.findById.mockResolvedValue({ _id: 'vendor1', status: 'active' });
    shippingService.calculate.mockReturnValue(0);
    couponRepo.lockCoupon.mockResolvedValue(false);

    await expect(
      orderService.placeOrder({
        user: { id: 'user1' },
        sessionId: 'sess-1',
        payload: {
          shippingAddressId: 'addr',
          billingAddressId: 'addr',
          paymentMethod: 'stripe',
          taxPercent: 0,
        },
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(couponRepo.lockCoupon).toHaveBeenCalledTimes(1);
    expect(couponService.preview).not.toHaveBeenCalled();
  });
});

describe('OrderService.failOrder', () => {
  it('returns reserved inventory and unlocks coupon on payment failure to prevent stock leaks', async () => {
    const session = mockSession();
    const orderDoc = {
      _id: 'order1',
      orderStatus: 'created',
      paymentStatus: 'pending',
      couponId: 'coupon1',
      userId: 'user1',
      save: jest.fn(),
    };
    orderRepo.findById.mockResolvedValue(orderDoc);
    orderRepo.findItemsByOrder.mockResolvedValue([
      { productVariantId: 'variant1', quantity: 2 },
      { productVariantId: 'variant2', quantity: 1 },
    ]);

    await orderService.failOrder('order1');

    expect(orderRepo.findById).toHaveBeenCalledWith('order1', session);
    expect(inventoryService.release).toHaveBeenCalledWith(
      'variant1',
      2,
      session,
      expect.objectContaining({ orderId: 'order1' }),
    );
    expect(inventoryService.release).toHaveBeenCalledWith(
      'variant2',
      1,
      session,
      expect.objectContaining({ orderId: 'order1' }),
    );
    expect(orderDoc.orderStatus).toBe('cancelled');
    expect(orderDoc.paymentStatus).toBe('failed');
    expect(couponRepo.removeUsageByOrder).toHaveBeenCalledWith(
      'order1',
      session,
    );
    expect(couponRepo.unlockCoupon).toHaveBeenCalledWith({
      couponId: 'coupon1',
      userId: 'user1',
    });
    expect(orderDoc.save).toHaveBeenCalledWith({ session });
  });
});
