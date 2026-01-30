/**
 * Order repo mutations must write audit versions and events atomically.
 * These integration tests use in-memory Mongo to ensure versioning and lock rules hold.
 */
jest.unmock('mongoose');
const mongoose = require('mongoose');
const orderRepo = require('../../modules/orders/order.repo');
const orderVersionRepo = require('../../modules/orders/orderVersion.repo');
const orderEventRepo = require('../../modules/orders/orderEvent.repo');
const Order = require('../../models/Order.model');
const {
  connectTestDB,
  clearDatabase,
  disconnectTestDB,
} = require('../helpers/mongo');

describe('OrderRepository.applyOrderMutation', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it('applies mutation, creates version + event, and locks on payment reason', async () => {
    const order = await Order.create({
      userId: new mongoose.Types.ObjectId(),
      shippingAddressId: new mongoose.Types.ObjectId(),
      billingAddressId: new mongoose.Types.ObjectId(),
      orderNumber: 'ORD-TEST',
      totalItems: 1,
      subtotal: 100,
      taxAmount: 0,
      shippingFee: 0,
      discountAmount: 0,
      grandTotal: 100,
      paymentMethod: 'card',
      orderStatus: 'created',
      paymentStatus: 'pending',
    });

    const updated = await orderRepo.applyOrderMutation({
      orderId: order._id,
      reason: 'payment',
      actor: { type: 'system' },
      mutateFn: (o) => {
        o.orderStatus = 'confirmed';
        o.paymentStatus = 'paid';
      },
    });

    expect(updated.orderStatus).toBe('confirmed');
    expect(updated.isLocked).toBe(true);

    const versions = await orderVersionRepo.listByOrder(order._id);
    expect(versions).toHaveLength(1);
    expect(versions[0].snapshot.orderStatus).toBe('confirmed');

    const events = await orderEventRepo.listByOrder(order._id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      previousStatus: 'created',
      newStatus: 'confirmed',
      type: 'PAYMENT',
    });
  });

  it('rejects admin updates on locked orders to protect paid orders', async () => {
    const locked = await Order.create({
      userId: new mongoose.Types.ObjectId(),
      shippingAddressId: new mongoose.Types.ObjectId(),
      billingAddressId: new mongoose.Types.ObjectId(),
      orderNumber: 'ORD-LOCK',
      totalItems: 1,
      subtotal: 50,
      taxAmount: 0,
      shippingFee: 0,
      discountAmount: 0,
      grandTotal: 50,
      paymentMethod: 'card',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      isLocked: true,
    });

    await expect(
      orderRepo.applyOrderMutation({
        orderId: locked._id,
        reason: 'admin_update',
        actor: { type: 'admin', actorId: new mongoose.Types.ObjectId() },
        mutateFn: (o) => {
          o.orderStatus = 'cancelled';
        },
      }),
    ).rejects.toThrow('Locked order cannot be modified');
  });
});
