const adminService = require('../modules/admin/admin.service');
const userRepo = require('../modules/users/user.repo');
const { AppError } = require('../utils/apiResponse');

jest.mock('../modules/users/user.repo', () => ({
  findById: jest.fn(),
  updateById: jest.fn(),
  findPendingWholesale: jest.fn(),
}));

describe('AdminService.reviewWholesaleUser', () => {
  const admin = { role: 'admin' };
  const nonAdmin = { role: 'vendor' };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('rejects non-admin', async () => {
    await expect(
      adminService.reviewWholesaleUser(nonAdmin, 'user1', { action: 'approve' }),
    ).rejects.toMatchObject({ message: 'Unauthorized', statusCode: 403 });
    expect(userRepo.findById).not.toHaveBeenCalled();
  });

  test('validates payload shape', async () => {
    await expect(
      adminService.reviewWholesaleUser(admin, 'user1', { action: 'invalid' }),
    ).rejects.toBeInstanceOf(AppError);
    expect(userRepo.findById).not.toHaveBeenCalled();
  });

  test('throws when user not found', async () => {
    userRepo.findById.mockResolvedValue(null);

    await expect(
      adminService.reviewWholesaleUser(admin, 'missing-user', { action: 'approve' }),
    ).rejects.toMatchObject({ message: 'User not found', statusCode: 404 });
    expect(userRepo.findById).toHaveBeenCalledWith('missing-user');
  });

  test('throws when user is not wholesale', async () => {
    userRepo.findById.mockResolvedValue({
      _id: 'u1',
      customerType: 'retail',
      verificationStatus: 'pending',
    });

    await expect(
      adminService.reviewWholesaleUser(admin, 'u1', { action: 'approve' }),
    ).rejects.toMatchObject({ message: 'Not a wholesale user', statusCode: 400 });
  });

  test('throws when already reviewed', async () => {
    userRepo.findById.mockResolvedValue({
      _id: 'u1',
      customerType: 'wholesale',
      verificationStatus: 'approved',
    });

    await expect(
      adminService.reviewWholesaleUser(admin, 'u1', { action: 'approve' }),
    ).rejects.toMatchObject({ message: 'User already reviewed', statusCode: 409 });
  });

  test('approves wholesale user', async () => {
    userRepo.findById.mockResolvedValue({
      _id: 'u1',
      customerType: 'wholesale',
      verificationStatus: 'pending',
    });
    userRepo.updateById.mockResolvedValue({ _id: 'u1', verificationStatus: 'approved' });

    const result = await adminService.reviewWholesaleUser(admin, 'u1', {
      action: 'approve',
    });

    expect(userRepo.updateById).toHaveBeenCalledWith('u1', {
      verificationStatus: 'approved',
      status: 'active',
    });
    expect(result).toEqual({ _id: 'u1', verificationStatus: 'approved' });
  });

  test('rejects wholesale user with reason', async () => {
    userRepo.findById.mockResolvedValue({
      _id: 'u1',
      customerType: 'wholesale',
      verificationStatus: 'pending',
    });
    userRepo.updateById.mockResolvedValue({ _id: 'u1', verificationStatus: 'rejected' });

    const result = await adminService.reviewWholesaleUser(admin, 'u1', {
      action: 'reject',
      reason: 'documents invalid',
    });

    expect(userRepo.updateById).toHaveBeenCalledWith('u1', {
      verificationStatus: 'rejected',
      status: 'inactive',
      rejectionReason: 'documents invalid',
    });
    expect(result).toEqual({ _id: 'u1', verificationStatus: 'rejected' });
  });
});

describe('AdminService.listPendingWholesale', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns pending wholesale users', async () => {
    const pending = [{ _id: 'u1' }, { _id: 'u2' }];
    userRepo.findPendingWholesale.mockResolvedValue(pending);

    const result = await adminService.listPendingWholesale();

    expect(userRepo.findPendingWholesale).toHaveBeenCalled();
    expect(result).toEqual(pending);
  });
});
