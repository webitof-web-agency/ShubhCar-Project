/**
 * Cart routes smoke tests: ensure auth is enforced and controllers are wired.
 */
jest.mock('../../modules/cart/cart.controller', () => ({
  getCart: jest.fn((req, res) => res.ok({ cart: true })),
  addItem: jest.fn((req, res) => res.ok({ added: true })),
  updateQuantity: jest.fn((req, res) => res.ok({ updated: true })),
  removeItem: jest.fn((req, res) => res.ok({ removed: true })),
  applyCoupon: jest.fn((req, res) => res.ok({ coupon: true })),
  removeCoupon: jest.fn((req, res) => res.ok({ couponRemoved: true })),
}));
jest.mock('../../utils/jwt', () => ({
  verifyToken: jest.fn(),
}));

const request = require('supertest');
const app = require('../../app');
const controller = require('../../modules/cart/cart.controller');
const { verifyToken } = require('../../utils/jwt');

describe('Cart routes smoke', () => {
  beforeEach(() => {
    verifyToken.mockReturnValue({ userId: 'u1', role: 'customer' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requires auth and hits controller for add item', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', 'Bearer t')
      .send({ productVariantId: '64b000000000000000000001', quantity: 1 });

    expect(res.status).toBe(200);
    expect(controller.addItem).toHaveBeenCalled();
  });

  it('blocks unauthenticated access', async () => {
    verifyToken.mockImplementationOnce(() => {
      throw new Error('bad token');
    });

    const res = await request(app).get('/api/v1/cart');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
