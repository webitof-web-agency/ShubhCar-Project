/**
 * Sales report aggregation is business critical: dashboards and payouts depend on it.
 * This integration test uses a real (in-memory) MongoDB to catch aggregation regressions.
 */
const mongoose = require('mongoose');
const salesReportsRepo = require('../../modules/salesReports/salesReports.repo');
const Order = require('../../models/Order.model');
const OrderItem = require('../../models/OrderItem.model');
const OrderVendorSplit = require('../../models/OrderVendorSplit.model');
const {
  connectTestDB,
  clearDatabase,
  disconnectTestDB,
} = require('../helpers/mongo');

describe('SalesReportsRepo.summary', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it('returns accurate revenue/items/vendor payouts within the requested window', async () => {
    const vendorA = new mongoose.Types.ObjectId();
    const vendorB = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const addressId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const variantIdA = new mongoose.Types.ObjectId();
    const variantIdB = new mongoose.Types.ObjectId();

    const outOfRangeDate = new Date('2024-01-05T00:00:00Z');
    const inRangeDate = new Date('2024-02-10T00:00:00Z');

    // Out-of-range order to verify date filters exclude stale data.
    await Order.create({
      userId,
      shippingAddressId: addressId,
      billingAddressId: addressId,
      orderNumber: 'ORD-OUT',
      totalItems: 1,
      subtotal: 100,
      taxAmount: 10,
      shippingFee: 0,
      discountAmount: 0,
      grandTotal: 110,
      paymentMethod: 'card',
      createdAt: outOfRangeDate,
    });

    // In-range order with multiple vendors to exercise the aggregation paths.
    const inRangeOrder = await Order.create({
      userId,
      shippingAddressId: addressId,
      billingAddressId: addressId,
      orderNumber: 'ORD-IN',
      totalItems: 3,
      subtotal: 350,
      taxAmount: 30,
      shippingFee: 20,
      discountAmount: 0,
      grandTotal: 400,
      paymentMethod: 'card',
      createdAt: inRangeDate,
    });

    await OrderItem.create([
      {
        orderId: inRangeOrder._id,
        vendorId: vendorA,
        productId,
        productVariantId: variantIdA,
        sku: 'SKU-A',
        quantity: 2,
        price: 100,
        taxPercent: 10,
        taxAmount: 20,
        total: 220,
        createdAt: inRangeDate,
      },
      {
        orderId: inRangeOrder._id,
        vendorId: vendorB,
        productId,
        productVariantId: variantIdB,
        sku: 'SKU-B',
        quantity: 1,
        price: 150,
        taxPercent: 10,
        taxAmount: 15,
        total: 180,
        createdAt: inRangeDate,
      },
    ]);

    await OrderVendorSplit.create([
      {
        orderId: inRangeOrder._id,
        vendorId: vendorA,
        vendorSubtotal: 220,
        vendorTax: 15,
        vendorShippingShare: 8,
        platformCommission: 20,
        finalPayout: 223,
        createdAt: inRangeDate,
      },
      {
        orderId: inRangeOrder._id,
        vendorId: vendorB,
        vendorSubtotal: 180,
        vendorTax: 12,
        vendorShippingShare: 7,
        platformCommission: 15,
        finalPayout: 184,
        createdAt: inRangeDate,
      },
    ]);

    const summary = await salesReportsRepo.summary({
      from: '2024-02-01',
      to: '2024-02-28',
    });

    expect(summary.orders).toMatchObject({
      totalOrders: 1,
      totalRevenue: 400,
    });
    expect(summary.items).toMatchObject({
      totalItems: 3,
      totalItemRevenue: 400,
    });
    expect(summary.vendors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: vendorA,
          vendorSubtotal: 220,
          vendorTax: 15,
          vendorShippingShare: 8,
          platformCommission: 20,
          finalPayout: 223,
        }),
        expect.objectContaining({
          _id: vendorB,
          vendorSubtotal: 180,
          vendorTax: 12,
          vendorShippingShare: 7,
          platformCommission: 15,
          finalPayout: 184,
        }),
      ]),
    );
  });
});
