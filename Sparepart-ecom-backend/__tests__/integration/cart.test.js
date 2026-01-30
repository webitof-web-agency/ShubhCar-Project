const request = require('supertest');
const {
  setupIntegrationTests,
  clearDatabase,
  teardownIntegrationTests,
} = require('./setup');
const {
  createUser,
  createProduct,
} = require('./helpers/factories');
const ProductVariant = require('../../models/ProductVariant.model');
const CartItem = require('../../models/CartItem.model');

let app;

describe('Cart + Inventory Safety Integration Tests', () => {
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

  beforeEach(async () => {
    // Create and authenticate user
    const email = 'cart@example.com';
    const password = 'Password123!';

    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Cart',
        lastName: 'Test',
        email,
        password,
        phone: '1234567890',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    token = loginResponse.body.data.token;
    user = loginResponse.body.data.user;
  });

  describe('POST /api/cart/items - Add Item', () => {
    it('should add item to cart when sufficient stock available', async () => {
      const { variants } = await createProduct({
        stockQty: 10,
        reservedQty: 0,
      });

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(5);

      // Assert database side-effect
      const cartItems = await CartItem.find({});
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].quantity).toBe(5);
    });

    it('CRITICAL: should prevent adding items beyond available stock (stockQty - reservedQty)', async () => {
      const { variants } = await createProduct({
        stockQty: 10,
        reservedQty: 7, // availableQty = 3
      });

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 5, // Trying to add more than available
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/insufficient stock/i);

      // Assert NO cart item was created
      const cartItems = await CartItem.find({});
      expect(cartItems).toHaveLength(0);
    });

    it('should allow adding exactly the available quantity', async () => {
      const { variants } = await createProduct({
        stockQty: 10,
        reservedQty: 7, // availableQty = 3
      });

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 3, // Exact available quantity
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0].quantity).toBe(3);
    });

    it('should reject adding item when all stock is reserved', async () => {
      const { variants } = await createProduct({
        stockQty: 10,
        reservedQty: 10, // availableQty = 0
      });

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/insufficient stock/i);
    });
  });

  describe('PATCH /api/cart/items/:itemId - Update Quantity', () => {
    it('should update quantity within available stock limits', async () => {
      const { variants } = await createProduct({
        stockQty: 20,
        reservedQty: 5, // availableQty = 15
      });

      // Add item first
      const addResponse = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 5,
        });

      const itemId = addResponse.body.data.items[0]._id;

      // Update quantity
      const response = await request(app)
        .patch(`/api/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          quantity: 10, // Still within availableQty
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0].quantity).toBe(10);
    });

    it('CRITICAL: should prevent updating quantity beyond available stock', async () => {
      const { variants } = await createProduct({
        stockQty: 20,
        reservedQty: 15, // availableQty = 5
      });

      // Add item first
      const addResponse = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 2,
        });

      const itemId = addResponse.body.data.items[0]._id;

      // Try to update beyond available
      const response = await request(app)
        .patch(`/api/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          quantity: 10, // Exceeds availableQty
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/insufficient stock/i);

      // Assert quantity unchanged in database
      const cartItem = await CartItem.findById(itemId);
      expect(cartItem.quantity).toBe(2);
    });

    it('should respect reserved quantities when updating', async () => {
      const { variants } = await createProduct({
        stockQty: 50,
        reservedQty: 45, // availableQty = 5
      });

      const addResponse = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 3,
        });

      const itemId = addResponse.body.data.items[0]._id;

      // Can update to 5 (available)
      await request(app)
        .patch(`/api/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 5 })
        .expect(200);

      // Cannot update to 6 (exceeds available)
      const failResponse = await request(app)
        .patch(`/api/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 6 })
        .expect(400);

      expect(failResponse.body.message).toMatch(/insufficient stock/i);
    });
  });

  describe('Cart Persistence', () => {
    it('should persist cart items per user across sessions', async () => {
      const { variants } = await createProduct({
        stockQty: 100,
        reservedQty: 0,
      });

      // Add item to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 5,
        });

      // Get cart again (simulating new session)
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(5);
    });

    it('should isolate carts between different users', async () => {
      const { variants } = await createProduct({
        stockQty: 100,
        reservedQty: 0,
      });

      // User 1 adds to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 5,
        });

      // Create User 2
      const email2 = 'cart2@example.com';
      await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Cart2',
          lastName: 'Test',
          email: email2,
          password: 'Password123!',
          phone: '9876543210',
        });

      const loginResponse2 = await request(app)
        .post('/api/auth/login')
        .send({ email: email2, password: 'Password123!' });

      const token2 = loginResponse2.body.data.token;

      // User 2's cart should be empty
      const response2 = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response2.body.data.items).toHaveLength(0);
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error message on insufficient stock', async () => {
      const { variants } = await createProduct({
        stockQty: 5,
        reservedQty: 5, // No stock available
      });

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productVariantId: variants[0]._id.toString(),
          quantity: 1,
        })
        .expect(400);

      expect(response.body.message).toMatch(/insufficient stock/i);
      expect(response.body.success).toBe(false);
    });
  });
});
