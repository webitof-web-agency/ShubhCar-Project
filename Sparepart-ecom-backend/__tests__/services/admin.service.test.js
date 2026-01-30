/**
 * Admin service tests focus on wholesale review rules: only admins, correct state checks, and proper updates.
 */
jest.mock('../../modules/users/user.repo', () => ({
  findById: jest.fn(),
  updateById: jest.fn(),
  findPendingWholesale: jest.fn(),
}));

const adminService = require('../../modules/admin/admin.service');
const userRepo = require('../../modules/users/user.repo');
const { AppError } = require('../../utils/apiResponse');

const admin = { role: 'admin', id: 'admin1' };
const reviewer = { role: 'customer', id: 'cust1' };

describe('AdminService.reviewWholesaleUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-admin reviewers', async () => {
    await expect(
      adminService.reviewWholesaleUser(reviewer, 'u1', { action: 'approve' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects invalid payloads (missing reason on reject)', async () => {
    await expect(
      adminService.reviewWholesaleUser(admin, 'u1', { action: 'reject' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects when user not found or not wholesale/pending', async () => {
    userRepo.findById.mockResolvedValue(null);
    await expect(
      adminService.reviewWholesaleUser(admin, 'missing', { action: 'approve' }),
    ).rejects.toBeInstanceOf(AppError);

    userRepo.findById.mockResolvedValue({ _id: 'u2', customerType: 'retail' });
    await expect(
      adminService.reviewWholesaleUser(admin, 'u2', { action: 'approve' }),
    ).rejects.toBeInstanceOf(AppError);

    userRepo.findById.mockResolvedValue({
      _id: 'u3',
      customerType: 'wholesale',
      verificationStatus: 'approved',
    });
    await expect(
      adminService.reviewWholesaleUser(admin, 'u3', { action: 'approve' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('approves wholesale user and activates account', async () => {
    userRepo.findById.mockResolvedValue({
      _id: 'u4',
      customerType: 'wholesale',
      verificationStatus: 'pending',
    });
    userRepo.updateById.mockResolvedValue({
      _id: 'u4',
      verificationStatus: 'approved',
      status: 'active',
    });

    const res = await adminService.reviewWholesaleUser(admin, 'u4', {
      action: 'approve',
    });

    expect(userRepo.updateById).toHaveBeenCalledWith('u4', {
      verificationStatus: 'approved',
      status: 'active',
    });
    expect(res.status).toBe('active');
  });

  it('rejects wholesale user with reason and deactivates', async () => {
    userRepo.findById.mockResolvedValue({
      _id: 'u5',
      customerType: 'wholesale',
      verificationStatus: 'pending',
    });
    userRepo.updateById.mockResolvedValue({
      _id: 'u5',
      verificationStatus: 'rejected',
      status: 'inactive',
      rejectionReason: 'Incomplete docs',
    });

    const res = await adminService.reviewWholesaleUser(admin, 'u5', {
      action: 'reject',
      reason: 'Incomplete docs',
    });

    expect(userRepo.updateById).toHaveBeenCalledWith('u5', {
      verificationStatus: 'rejected',
      status: 'inactive',
      rejectionReason: 'Incomplete docs',
    });
    expect(res.verificationStatus).toBe('rejected');
  });
});

describe('AdminService.listPendingWholesale', () => {
  it('delegates to repo for pending wholesale users', async () => {
    userRepo.findPendingWholesale.mockResolvedValue([{ _id: 'u6' }]);
    const res = await adminService.listPendingWholesale();
    expect(userRepo.findPendingWholesale).toHaveBeenCalled();
    expect(res).toEqual([{ _id: 'u6' }]);
  });
});
