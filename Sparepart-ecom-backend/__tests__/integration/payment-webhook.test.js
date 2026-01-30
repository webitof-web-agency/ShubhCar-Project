const request = require('supertest');
const crypto = require('crypto');
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
const ProductVariant = require('../../models/ProductVariant.model');
const Payment = require('../../models/Payment.model');

let app;

// Mock Stripe signature verification
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn((body, sig, secret) => {
        // Return mock event for valid signature
        if (sig === 'valid-signature') {
          return JSON.parse(body);
        }
        throw new Error('Invalid signature');
      }),
    },
  }));
});

describe('Payment Webhook Integration Tests', () => {
  beforeAll(async () => {
    const setup = await setupIntegrationTests();
    app = setup.app;
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  describe('POST /api/webhooks/stripe - Stripe Webhook', () => {
    let user;
    let order;
    let variant;

    beforeEach(async () => {
      await createShippingConfig();
      user = await createUser();
      const address = await createAddress(user._id);
      
      const { product, variants } = await createProduct({
        stockQty: 100,
        reservedQty: 0,
      });
      variant = variants[0];

      // Reserve stock for order
      await ProductVariant.findByIdAndUpdate(variant._id, {
        $inc: { reservedQty: 5 },
      });

      const orderData = await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: product._id,
            variantId: variant._id,
            vendorId: product.vendorId,
            sku: variant.sku,
            quantity: 5,
            price: variant.price,
          },
        ],
        paymentStatus: 'pending',
        orderStatus: 'created',
      });

      order = orderData.order;
    });

    it('CRITICAL: should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            metadata: { orderId: order._id.toString() },
            amount: order.grandTotal * 100,
            currency: 'inr',
            status: 'succeeded',
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid-signature')
        .send(webhookPayload)
        .expect(400);

      // Order should remain in pending status
      const dbOrder = await Order.findById(order._id);
      expect(dbOrder.paymentStatus).toBe('pending');

      // Inventory should NOT be committed
      const dbVariant = await ProductVariant.findById(variant._id);
      expect(dbVariant.stockQty).toBe(100); // Unchanged
      expect(dbVariant.reservedQty).toBe(5); // Still reserved
    });

    it('should mark order as paid on valid payment webhook', async () => {
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_${Date.now()}`,
            metadata: { orderId: order._id.toString() },
            amount: order.grandTotal * 100,
            currency: 'inr',
            status: 'succeeded',
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid-signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      // Check order status
      const dbOrder = await Order.findById(order._id);
      expect(dbOrder.paymentStatus).toBe('paid');
      expect(dbOrder.orderStatus).toBe('confirmed');
    });

    it('CRITICAL: should commit inventory (decrement stock and reserved)', async () => {
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_${Date.now()}`,
            metadata: { orderId: order._id.toString() },
            amount: order.grandTotal * 100,
            currency: 'inr',
            status: 'succeeded',
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid-signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      // Check inventory committed
      const dbVariant = await ProductVariant.findById(variant._id);
      expect(dbVariant.stockQty).toBe(95); // 100 - 5 committed
      expect(dbVariant.reservedQty).toBe(0); // 5 - 5 released
    });

    it('CRITICAL: should handle duplicate webhooks (idempotency)', async () => {
      const paymentIntentId = `pi_${Date.now()}`;
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            metadata: { orderId: order._id.toString() },
            amount: order.grandTotal * 100,
            currency: 'inr',
            status: 'succeeded',
          },
        },
      };

      // First webhook
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid-signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      // Get state after first webhook
      const orderAfterFirst = await Order.findById(order._id);
      const variantAfterFirst = await ProductVariant.findById(variant._id);

      // Second webhook (duplicate)
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid-signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      // Check that state hasn't changed
      const orderAfterSecond = await Order.findById(order._id);
      const variantAfterSecond = await ProductVariant.findById(variant._id);

      expect(orderAfterSecond.paymentStatus).toBe(orderAfterFirst.paymentStatus);
      expect(variantAfterSecond.stockQty).toBe(variantAfterFirst.stockQty);
      expect(variantAfterSecond.reservedQty).toBe(variantAfterFirst.reservedQty);
    });

    it('should handle payment failure webhook', async () => {
      const webhookPayload = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: `pi_${Date.now()}`,
            metadata: { orderId: order._id.toString() },
            amount: order.grandTotal * 100,
            currency: 'inr',
            status: 'failed',
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid-signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      // Order should be cancelled
      const dbOrder = await Order.findById(order._id);
      expect(dbOrder.paymentStatus).toBe('failed');
      expect(dbOrder.orderStatus).toBe('cancelled');

      // Inventory should be released (not committed)
      const dbVariant = await ProductVariant.findById(variant._id);
      expect(dbVariant.stockQty).toBe(100); // Unchanged
      expect(dbVariant.reservedQty).toBe(0); // Released back to available
    });

    it('should ignore webhook for non-existent order', async () => {
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_${Date.now()}`,
            metadata: { orderId: '000000000000000000000000' }, // Non-existent
            amount: 10000,
            currency: 'inr',
            status: 'succeeded',
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid-signature')
        .send(JSON.stringify(webhookPayload))
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/webhooks/razorpay - Razorpay Webhook', () => {
    let user;
    let order;
    let variant;

    beforeEach(async () => {
      await createShippingConfig();
      user = await createUser();
      const address = await createAddress(user._id);
      
      const { product, variants } = await createProduct({
        stockQty: 50,
        reservedQty: 0,
      });
      variant = variants[0];

      await ProductVariant.findByIdAndUpdate(variant._id, {
        $inc: { reservedQty: 3 },
      });

      const orderData = await createOrder({
        userId: user._id,
        shippingAddressId: address._id,
        billingAddressId: address._id,
        items: [
          {
            productId: product._id,
            variantId: variant._id,
            vendorId: product.vendorId,
            sku: variant.sku,
            quantity: 3,
            price: variant.price,
          },
        ],
        paymentStatus: 'pending',
      });

      order = orderData.order;
    });

    it('should validate Razorpay webhook signature', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_${Date.now()}`,
              order_id: `order_${order._id}`,
              amount: order.grandTotal * 100,
              status: 'captured',
            },
          },
        },
      };

      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret';
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .send(webhookPayload)
        .expect(200);

      const dbOrder = await Order.findById(order._id);
      expect(dbOrder.paymentStatus).toBe('paid');
    });

    it('CRITICAL: should prevent double-processing on rapid duplicate webhooks', async () => {
      const paymentId = `pay_${Date.now()}`;
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: `order_${order._id}`,
              amount: order.grandTotal * 100,
              status: 'captured',
            },
          },
        },
      };

      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret';
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      // Send two webhooks in parallel
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/webhooks/razorpay')
          .set('x-razorpay-signature', signature)
          .send(webhookPayload),
        request(app)
          .post('/api/webhooks/razorpay')
          .set('x-razorpay-signature', signature)
          .send(webhookPayload),
      ]);

      // Both should succeed without error
      expect([response1.status, response2.status]).toEqual(
        expect.arrayContaining([200, 200])
      );

      // But stock should only be committed once
      const dbVariant = await ProductVariant.findById(variant._id);
      expect(dbVariant.stockQty).toBe(47); // 50 - 3 (only once)
      expect(dbVariant.reservedQty).toBe(0);
    });
  });
});
