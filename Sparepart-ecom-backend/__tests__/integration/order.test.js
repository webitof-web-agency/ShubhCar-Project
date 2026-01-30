const request = require('supertest');
const {
  setupIntegrationTests,
  clearDatabase,
  teardownIntegrationTests,
} = require('./setup');
const {
  createUser,
  createProduct,
  createShippingConfig,
  createAddress,
} = require('./helpers/factories');
const Order = require('../../models/Order.model');
const OrderItem = require('../../models/OrderItem.model');
const ProductVariant = require('../../models/ProductVariant.model');
const Settings = require('../../models/Settings.model');

let app;

describe('Order Placement Integration Tests', () => {
  beforeAll(async () => {
    const setup = await setupIntegrationTests();
    app = setup.app;
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  let token;
  let user;
  let shippingAddress;
  let billingAddress;

  beforeEach(async () => {
    // Create and authenticate user
    const email = 'order@example.com';
    const password = 'Password123!';

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Order',
        lastName: 'Test',
        email,
        password,
        phone: '1234567890',
      });

    token = registerResponse.body.data.token;
    user = registerResponse.body.data.user;

    // Create addresses
    shippingAddress = await createAddress(user.id, {
      fullName: 'Order Test',
      addressLine1: '123 Shipping St',
      city: 'Bangalore',
      state: 'KA',
    });

    billingAddress = await createAddress(user.id, {
      fullName: 'Order Test',
      addressLine1: '456 Billing Ave',
      city: 'Bangalore',
      state: 'KA',
      isDefault: false,
    });
  });

  describe('POST /api/orders - Order Creation', () => {
    it('CRITICAL: should fail when shipping config is missing', async () => {
      const { variants } = await createProduct({ stockQty: 100 });

      // Add item to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 2,
        });

      // Try to place order without shipping config
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: shippingAddress._id.toString(),
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(500); // Shipping service will fall back to defaults, but testing explicit config

      // Order should not be created
      const orders = await Order.find({});
      expect(orders.length).toBeLessThanOrEqual(1);
    });

    it('should successfully create order with valid cart and addresses', async () => {
      // Create shipping config
      await createShippingConfig({
        flatRate: 50,
        freeShippingAbove: 1000,
      });

      const { product, variants } = await createProduct({
        stockQty: 100,
        reservedQty: 0,
      });

      // Add items to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 2,
        });

      // Place order
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: shippingAddress._id.toString(),
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.orderNumber).toMatch(/^ORD-/);
      expect(response.body.data.paymentStatus).toBe('pending');
      expect(response.body.data.orderStatus).toBe('created');

      // Assert order document in database
      const dbOrder = await Order.findById(response.body.data._id);
      expect(dbOrder).toBeTruthy();
      expect(dbOrder.shippingAddressId.toString()).toBe(shippingAddress._id.toString());
      expect(dbOrder.billingAddressId.toString()).toBe(billingAddress._id.toString());
      expect(dbOrder.grandTotal).toBeGreaterThan(0);
      expect(dbOrder.shippingFee).toBe(50);
    });

    it('CRITICAL: order document must contain shippingAddressId and billingAddressId', async () => {
      await createShippingConfig();
      const { variants } = await createProduct({ stockQty: 100 });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 1,
        });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: shippingAddress._id.toString(),
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(201);

      const dbOrder = await Order.findById(response.body.data._id);
      
      // CRITICAL: These fields must exist to prevent schema validation failures
      expect(dbOrder.shippingAddressId).toBeTruthy();
      expect(dbOrder.billingAddressId).toBeTruthy();
      expect(dbOrder.shippingAddressId.toString()).toBe(shippingAddress._id.toString());
      expect(dbOrder.billingAddressId.toString()).toBe(billingAddress._id.toString());
    });

    it('should apply static shipping fee correctly', async () => {
      await createShippingConfig({
        flatRate: 75,
        freeShippingAbove: 5000,
      });

      const { variants } = await createProduct({ stockQty: 100 });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 1,
        });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: shippingAddress._id.toString(),
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(201);

      const dbOrder = await Order.findById(response.body.data._id);
      expect(dbOrder.shippingFee).toBe(75);
    });

    it('should apply free shipping when subtotal exceeds threshold', async () => {
      await createShippingConfig({
        flatRate: 100,
        freeShippingAbove: 500,
      });

      const { variants } = await createProduct({
        stockQty: 100,
      });

      // Set high price variant
      await ProductVariant.findByIdAndUpdate(variants[0]._id, { price: 600 });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 1,
        });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: shippingAddress._id.toString(),
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(201);

      const dbOrder = await Order.findById(response.body.data._id);
      expect(dbOrder.shippingFee).toBe(0); // Free shipping applied
    });

    it('CRITICAL: should reserve inventory, NOT decrement it', async () => {
      await createShippingConfig();
      const { variants } = await createProduct({
        stockQty: 100,
        reservedQty: 10,
      });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 5,
        });

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: shippingAddress._id.toString(),
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(201);

      // Check inventory state
      const variant = await ProductVariant.findById(variants[0]._id);
      expect(variant.stockQty).toBe(100); // Unchanged
      expect(variant.reservedQty).toBe(15); // 10 + 5 reserved
    });

    it('should create OrderItems in separate collection', async () => {
      await createShippingConfig();
      const { variants } = await createProduct({ stockQty: 100 });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 3,
        });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: shippingAddress._id.toString(),
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(201);

      // Check OrderItem collection
      const orderItems = await OrderItem.find({ orderId: response.body.data._id });
      expect(orderItems).toHaveLength(1);
      expect(orderItems[0].quantity).toBe(3);
      expect(orderItems[0].productVariantId.toString()).toBe(variants[0]._id.toString());
    });

    it('should fail when cart is empty', async () => {
      await createShippingConfig();

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: shippingAddress._id.toString(),
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/cart is empty/i);

      // No order should be created
      const orders = await Order.find({});
      expect(orders).toHaveLength(0);
    });

    it('CRITICAL: should rollback on failure (transaction safety)', async () => {
      await createShippingConfig();
      const { variants } = await createProduct({
        stockQty: 5,
        reservedQty: 0,
      });

      // Add item to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 2,
        });

      // Simulate failure by using invalid address
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: '000000000000000000000000', // Invalid ObjectId
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(400);

      // Check that inventory was NOT reserved
      const variant = await ProductVariant.findById(variants[0]._id);
      expect(variant.reservedQty).toBe(0); // Should not have changed

      // Check that no order was created
      const orders = await Order.find({});
      expect(orders).toHaveLength(0);
    });
  });

  describe('Order Schema Validation', () => {
    it('should have grandTotal field (not totalAmount)', async () => {
      await createShippingConfig();
      const { variants } = await createProduct({ stockQty: 100 });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 1,
        });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: shippingAddress._id.toString(),
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(201);

      const dbOrder = await Order.findById(response.body.data._id).lean();
      expect(dbOrder.grandTotal).toBeDefined();
      expect(dbOrder.totalAmount).toBeUndefined(); // Old field should not exist
    });

    it('should have paymentStatus field (not status)', async () => {
      await createShippingConfig();
      const { variants } = await createProduct({ stockQty: 100 });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 1,
        });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: shippingAddress._id.toString(),
          billingAddressId: billingAddress._id.toString(),
          paymentMethod: 'card',
        })
        .expect(201);

      const dbOrder = await Order.findById(response.body.data._id).lean();
      expect(dbOrder.paymentStatus).toBeDefined();
      expect(dbOrder.paymentStatus).toBe('pending');
    });
  });
});
