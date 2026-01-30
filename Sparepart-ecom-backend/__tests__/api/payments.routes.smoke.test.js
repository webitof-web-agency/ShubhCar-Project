/**
 * Smoke test payments API to ensure auth + validation are enforced and happy paths reach controller.
 */
jest.mock('../../modules/payments/payments.controller', () => ({
  initiate: jest.fn((req, res) => res.ok({ paymentId: 'pay_1' }, 'Payment initiated')),
  retry: jest.fn((req, res) => res.ok({ enqueued: true }, 'Payment retry enqueued')),
  getStatus: jest.fn((req, res) => res.ok({ paymentId: req.params.paymentId }, 'Payment status fetched')),
}));
jest.mock('../../utils/jwt', () => ({
  verifyToken: jest.fn(() => ({ userId: 'user1', role: 'customer' })),
}));

const request = require('supertest');
const app = require('../../app');
const controller = require('../../modules/payments/payments.controller');
const { verifyToken } = require('../../utils/jwt');

describe('Payments routes smoke', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires auth for initiate and passes validated body to controller', async () => {
    const res = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', 'Bearer token')
      .send({ orderId: 'order1', gateway: 'stripe' });

    expect(res.status).toBe(200);
    expect(controller.initiate).toHaveBeenCalled();
  });

  it('blocks unauthenticated requests', async () => {
    verifyToken.mockImplementationOnce(() => {
      throw new Error('Invalid token');
    });

    const res = await request(app)
      .post('/api/v1/payments/initiate')
      .send({ orderId: 'order1', gateway: 'stripe' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
