/**
 * Smoke tests to ensure admin routes stay protected and wired to the controller.
 * These catch missing auth/role checks that would expose admin-only endpoints.
 */
jest.mock('../../modules/admin/admin.service', () => ({
  listPendingWholesale: jest.fn(),
  reviewWholesaleUser: jest.fn(),
}));
jest.mock('../../utils/jwt', () => ({
  verifyToken: jest.fn(),
}));

const request = require('supertest');
const app = require('../../app');
const adminService = require('../../modules/admin/admin.service');
const { verifyToken } = require('../../utils/jwt');

describe('Admin routes smoke', () => {
  beforeEach(() => {
    verifyToken.mockReturnValue({ userId: 'admin-user', role: 'admin' });
  });

  it('allows admins to fetch pending wholesale users', async () => {
    adminService.listPendingWholesale.mockResolvedValue([{ id: 'u1' }]);

    const res = await request(app)
      .get('/api/v1/admin/wholesale/pending')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(adminService.listPendingWholesale).toHaveBeenCalledTimes(1);
    expect(res.body.success).toBe(true);
  });

  it('blocks requests without valid admin tokens', async () => {
    verifyToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const res = await request(app).get('/api/v1/admin/wholesale/pending');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
