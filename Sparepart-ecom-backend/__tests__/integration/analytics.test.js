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
  createOrder,
} = require('./helpers/factories');
const Order = require('../../models/Order.model');
const OrderItem = require('../../models/OrderItem.model');
const ProductVariant = require('../../models/ProductVariant.model');

let app;
let adminToken;

describe('Analytics Integration Tests', () => {
  beforeAll(async () => {
    const setup = await setupIntegrationTests();
    app = setup.app;

    // Create admin user and get token
    const adminEmail = 'admin@example.com';
    const adminPassword = 'AdminPassword123!';

    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        password: adminPassword,
        phone: '1111111111',
      });

    // Manually set role to admin
    const User = require('../../models/User.model');
    await User.findOneAndUpdate({ email: adminEmail }, { role: 'admin' });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword });

    adminToken = loginResponse.body.data.token;
  });

  beforeEach(async () => {
    await clearDatabase();
    await createShippingConfig();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  describe('GET /api/analytics/revenue - Revenue Summary', () => {
    it('CRITICAL: should only sum grandTotal for paid orders', async () => {
      const user = await createUser();
      const address = await createAddress(user._id);
      const { product, variants } = await createProduct({ stockQty: 100 });

      // Create paid order
      const paidOrder = await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: product._id,
            variantId: variants[0]._id,
            vendorId: product.vendorId,
            sku: variants[0].sku,
            quantity: 2,
            price: 100,
          },
        ],
        paymentStatus: 'paid',
        grandTotal: 300,
      });

      // Create pending order (should be excluded)
      await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: product._id,
            variantId: variants[0]._id,
            vendorId: product.vendorId,
            sku: variants[0].sku,
            quantity: 5,
            price: 100,
          },
        ],
        paymentStatus: 'pending',
        grandTotal: 600,
      });

      // Create failed order (should be excluded)
      await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: product._id,
            variantId: variants[0]._id,
            vendorId: product.vendorId,
            sku: variants[0].sku,
            quantity: 1,
            price: 100,
          },
        ],
        paymentStatus: 'failed',
        grandTotal: 150,
      });

      const response = await request(app)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRevenue).toBe(300); // Only paid order
      expect(response.body.data.totalOrders).toBe(1);
    });

    it('should use grandTotal field, not totalAmount', async () => {
      const user = await createUser();
      const address = await createAddress(user._id);
      const { product, variants } = await createProduct({ stockQty: 100 });

      await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: product._id,
            variantId: variants[0]._id,
            vendorId: product.vendorId,
            sku: variants[0].sku,
            quantity: 1,
            price: 250,
          },
        ],
        paymentStatus: 'paid',
        subtotal: 250,
        shippingFee: 50,
        grandTotal: 300,
      });

      const response = await request(app)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should use grandTotal (300), not subtotal (250)
      expect(response.body.data.totalRevenue).toBe(300);
    });

    it('CRITICAL: should exclude non-paid orders (paymentStatus !== paid)', async () => {
      const user = await createUser();
      const address = await createAddress(user._id);
      const { product, variants } = await createProduct({ stockQty: 100 });

      // Mix of payment statuses
      const statuses = ['paid', 'pending', 'failed', 'refunded', 'paid', 'paid'];
      const amounts = [100, 200, 150, 300, 250, 175];

      for (let i = 0; i < statuses.length; i++) {
        await createOrder({
          userId: user._id,
          shippingAddressId: address._id,
          billingAddressId: address._id,
          items: [
            {
              productId: product._id,
              variantId: variants[0]._id,
              vendorId: product.vendorId,
              sku: variants[0].sku,
              quantity: 1,
              price: amounts[i],
            },
          ],
          paymentStatus: statuses[i],
          grandTotal: amounts[i],
        });
      }

      const response = await request(app)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Only "paid" orders: 100 + 250 + 175 = 525
      expect(response.body.data.totalRevenue).toBe(525);
      expect(response.body.data.totalOrders).toBe(3);
    });

    it('should filter by date range', async () => {
      const user = await createUser();
      const address = await createAddress(user._id);
      const { product, variants } = await createProduct({ stockQty: 100 });

      // Order in range
      const orderInRange = await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: product._id,
            variantId: variants[0]._id,
            vendorId: product.vendorId,
            sku: variants[0].sku,
            quantity: 1,
            price: 100,
          },
        ],
        paymentStatus: 'paid',
        grandTotal: 100,
      });

      await Order.findByIdAndUpdate(orderInRange.order._id, {
        createdAt: new Date('2024-05-15'),
      });

      // Order out of range
      const orderOutOfRange = await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: product._id,
            variantId: variants[0]._id,
            vendorId: product.vendorId,
            sku: variants[0].sku,
            quantity: 1,
            price: 200,
          },
        ],
        paymentStatus: 'paid',
        grandTotal: 200,
      });

      await Order.findByIdAndUpdate(orderOutOfRange.order._id, {
        createdAt: new Date('2024-06-15'),
      });

      const response = await request(app)
        .get('/api/analytics/revenue')
        .query({ from: '2024-05-01', to: '2024-05-31' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.totalRevenue).toBe(100);
      expect(response.body.data.totalOrders).toBe(1);
    });
  });

  describe('GET /api/analytics/products/top - Top Products', () => {
    it('CRITICAL: should compute from OrderItem collection, not embedded items', async () => {
      const user = await createUser();
      const address = await createAddress(user._id);
      const { product: productA, variants: variantsA } = await createProduct({ stockQty: 100 });
      const { product: productB, variants: variantsB } = await createProduct({ stockQty: 100 });

      // Order 1: ProductA x 5, ProductB x 2
      const order1 = await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: productA._id,
            variantId: variantsA[0]._id,
            vendorId: productA.vendorId,
            sku: variantsA[0].sku,
            quantity: 5,
            price: 100,
          },
          {
            productId: productB._id,
            variantId: variantsB[0]._id,
            vendorId: productB.vendorId,
            sku: variantsB[0].sku,
            quantity: 2,
            price: 100,
          },
        ],
        paymentStatus: 'paid',
      });

      // Order 2: ProductB x 4
      await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: productB._id,
            variantId: variantsB[0]._id,
            vendorId: productB.vendorId,
            sku: variantsB[0].sku,
            quantity: 4,
            price: 100,
          },
        ],
        paymentStatus: 'paid',
      });

      const response = await request(app)
        .get('/api/analytics/products/top')
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      // ProductB should be first (6 total), ProductA second (5 total)
      expect(response.body.data[0].productId.toString()).toBe(productB._id.toString());
      expect(response.body.data[0].quantitySold).toBe(6);
      expect(response.body.data[1].productId.toString()).toBe(productA._id.toString());
      expect(response.body.data[1].quantitySold).toBe(5);
    });

    it('should only count paid orders', async () => {
      const user = await createUser();
      const address = await createAddress(user._id);
      const { product, variants } = await createProduct({ stockQty: 100 });

      // Paid order
      await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: product._id,
            variantId: variants[0]._id,
            vendorId: product.vendorId,
            sku: variants[0].sku,
            quantity: 10,
            price: 100,
          },
        ],
        paymentStatus: 'paid',
      });

      // Pending order (should NOT count)
      await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: product._id,
            variantId: variants[0]._id,
            vendorId: product.vendorId,
            sku: variants[0].sku,
            quantity: 50, // Large quantity but not paid
            price: 100,
          },
        ],
        paymentStatus: 'pending',
      });

      const response = await request(app)
        .get('/api/analytics/products/top')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].quantitySold).toBe(10); // Only paid order
    });
  });

  describe('GET /api/analytics/inventory/low-stock - Low Stock Alerts', () => {
    it('CRITICAL: should trigger based on availableQty (stockQty - reservedQty)', async () => {
      const { product, variants: [variant1] } = await createProduct({
        stockQty: 10,
        reservedQty: 7, // availableQty = 3
      });

      const { variants: [variant2] } = await createProduct({
        stockQty: 20,
        reservedQty: 0, // availableQty = 20
      });

      const { variants: [variant3] } = await createProduct({
        stockQty: 8,
        reservedQty: 6, // availableQty = 2
      });

      const response = await request(app)
        .get('/api/analytics/inventory/low-stock')
        .query({ threshold: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const lowStockSkus = response.body.data.map((v) => v.sku);
      
      // variant1 (availableQty=3) and variant3 (availableQty=2) should be included
      expect(lowStockSkus).toContain(variant1.sku);
      expect(lowStockSkus).toContain(variant3.sku);
      
      // variant2 (availableQty=20) should NOT be included
      expect(lowStockSkus).not.toContain(variant2.sku);
    });

    it('should use ProductVariant collection, not Inventory', async () => {
      const { variants } = await createProduct({
        stockQty: 4,
        reservedQty: 0,
      });

      const response = await request(app)
        .get('/api/analytics/inventory/low-stock')
        .query({ threshold: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('sku');
      expect(response.body.data[0]).toHaveProperty('stockQty');
      expect(response.body.data[0]).toHaveProperty('availableQty');
    });

    it('should respect threshold parameter', async () => {
      await createProduct({ stockQty: 15, reservedQty: 0 });
      await createProduct({ stockQty: 5, reservedQty: 0 });
      await createProduct({ stockQty: 2, reservedQty: 0 });

      // Threshold 10: should include variants with availableQty <= 10
      const response1 = await request(app)
        .get('/api/analytics/inventory/low-stock')
        .query({ threshold: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body.data.length).toBeGreaterThanOrEqual(2);

      // Threshold 3: should include only variants with availableQty <= 3
      const response2 = await request(app)
        .get('/api/analytics/inventory/low-stock')
        .query({ threshold: 3 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response2.body.data).toHaveLength(1);
    });
  });
});
