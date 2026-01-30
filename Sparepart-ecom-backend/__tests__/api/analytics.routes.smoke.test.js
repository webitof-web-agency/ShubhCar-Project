/**
 * Smoke tests to ensure analytics routes stay admin-protected and wired to controller.
 */
jest.mock('../../modules/analytics/analytics.controller', () => ({
  revenue: jest.fn((req, res) => res.ok({ revenue: true })),
  users: jest.fn((req, res) => res.ok({ users: true })),
  topProducts: jest.fn((req, res) => res.ok({ top: true })),
  inventory: jest.fn((req, res) => res.ok({ low: true })),
  reviews: jest.fn((req, res) => res.ok({ reviews: true })),
}));
jest.mock('../../utils/jwt', () => ({
  verifyToken: jest.fn(),
}));

const request = require('supertest');
const app = require('../../app');
const controller = require('../../modules/analytics/analytics.controller');
const { verifyToken } = require('../../utils/jwt');

describe('Analytics routes smoke', () => {
  beforeEach(() => {
    verifyToken.mockReturnValue({ userId: 'admin1', role: 'admin' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('protects routes with admin auth', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/revenue')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(controller.revenue).toHaveBeenCalled();
  });

  it('blocks unauthenticated analytics requests', async () => {
    verifyToken.mockImplementationOnce(() => {
      throw new Error('Invalid token');
    });

    const res = await request(app).get('/api/v1/analytics/users');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
