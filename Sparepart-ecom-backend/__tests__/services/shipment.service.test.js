/**
 * Shipment service tests: enforce paid orders, valid transitions, and tracking safety.
 */
jest.mock('../../jobs/order.jobs', () => ({
  enqueueStatusNotification: jest.fn(),
}));

const mongoose = require('mongoose');
const shipmentService = require('../../modules/shipments/shipment.service');
const orderJobs = require('../../jobs/order.jobs');
const Order = require('../../models/Order.model');
const OrderItem = require('../../models/OrderItem.model');
const Shipment = require('../../models/Shipment.model');
const { AppError } = require('../../utils/apiResponse');
const {
  connectTestDB,
  clearDatabase,
  disconnectTestDB,
} = require('../helpers/mongo');

const objectId = () => new mongoose.Types.ObjectId();

async function createOrder({ paymentStatus = 'paid', orderStatus = 'confirmed' } = {}) {
  return Order.create({
    userId: objectId(),
    shippingAddressId: objectId(),
    billingAddressId: objectId(),
    orderNumber: `ORD-${Math.random().toString().slice(2, 8)}`,
    totalItems: 1,
    subtotal: 100,
    taxAmount: 0,
    shippingFee: 0,
    discountAmount: 0,
    grandTotal: 100,
    paymentMethod: 'card',
    paymentStatus,
    orderStatus,
  });
}

async function createOrderItem(orderId, overrides = {}) {
  return OrderItem.create({
    orderId,
    vendorId: objectId(),
    productId: objectId(),
    productVariantId: objectId(),
    sku: 'SKU-1',
    quantity: 1,
    price: 100,
    discount: 0,
    taxPercent: 0,
    taxAmount: 0,
    shippingShare: 0,
    total: 100,
    status: 'pending',
    ...overrides,
  });
}

describe('ShipmentService', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it('blocks creating shipment for unpaid orders to prevent premature dispatch', async () => {
    const order = await createOrder({ paymentStatus: 'pending', orderStatus: 'confirmed' });
    const item = await createOrderItem(order._id);

    await expect(
      shipmentService.createShipment(item._id, {
        shippingProviderId: objectId(),
        trackingNumber: 'TRK1',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('creates shipment, updates order item, and notifies when order is paid', async () => {
    const order = await createOrder({ paymentStatus: 'paid', orderStatus: 'confirmed' });
    const item = await createOrderItem(order._id);

    const shipment = await shipmentService.createShipment(item._id, {
      shippingProviderId: objectId(),
      trackingNumber: 'TRK2',
      trackingUrlFormat: 'https://track.example.com/{{trackingNumber}}',
    });

    const updatedItem = await OrderItem.findById(item._id).lean();
    expect(shipment.status).toBe('shipped');
    expect(updatedItem.status).toBe('shipped');
    expect(orderJobs.enqueueStatusNotification).toHaveBeenCalledWith(order._id, 'shipped');
  });

  it('updates shipment status to delivered and syncs order item', async () => {
    const order = await createOrder({ paymentStatus: 'paid', orderStatus: 'confirmed' });
    const item = await createOrderItem(order._id, { status: 'confirmed' });
    await shipmentService.createShipment(item._id, {
      shippingProviderId: objectId(),
      trackingNumber: 'TRK3',
    });

    const updated = await shipmentService.updateShipmentStatus(item._id, {
      status: 'delivered',
    });

    const refreshedItem = await OrderItem.findById(item._id).lean();
    expect(updated.status).toBe('delivered');
    expect(updated.deliveredAt).toBeTruthy();
    expect(refreshedItem.status).toBe('delivered');
    expect(orderJobs.enqueueStatusNotification).toHaveBeenCalledWith(order._id, 'delivered');
  });

  it('rejects invalid status transitions to keep shipment state machine safe', async () => {
    const order = await createOrder({ paymentStatus: 'paid', orderStatus: 'confirmed' });
    const item = await createOrderItem(order._id);
    await shipmentService.createShipment(item._id, {
      shippingProviderId: objectId(),
      trackingNumber: 'TRK4',
    });

    // move to delivered first
    await shipmentService.updateShipmentStatus(item._id, { status: 'delivered' });

    await expect(
      shipmentService.updateShipmentStatus(item._id, { status: 'shipped' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('tracks shipment for admin without ownership block and builds tracking URL', async () => {
    const order = await createOrder({ paymentStatus: 'paid', orderStatus: 'confirmed' });
    const item = await createOrderItem(order._id);
    await shipmentService.createShipment(item._id, {
      shippingProviderId: objectId(),
      trackingNumber: 'TRK5',
      trackingUrlFormat: 'https://t/{{trackingNumber}}',
    });

    const tracking = await shipmentService.track({ role: 'admin', id: 'admin1' }, item._id);
    expect(tracking.trackingUrl).toBe('https://t/TRK5');
    expect(tracking.status).toBe('shipped');
  });

  it('admin list by order returns all shipments for order items', async () => {
    const order = await createOrder({ paymentStatus: 'paid', orderStatus: 'confirmed' });
    const item1 = await createOrderItem(order._id);
    const item2 = await createOrderItem(order._id);
    await shipmentService.createShipment(item1._id, {
      shippingProviderId: objectId(),
      trackingNumber: 'TRK6',
    });
    await shipmentService.createShipment(item2._id, {
      shippingProviderId: objectId(),
      trackingNumber: 'TRK7',
    });

    const list = await shipmentService.adminListByOrder(order._id);
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.trackingNumber).sort()).toEqual(['TRK6', 'TRK7']);
  });
});
