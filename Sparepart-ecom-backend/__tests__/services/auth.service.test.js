/**
 * Auth service tests cover high-risk flows: registration uniqueness, password login lockout,
 * token refresh session reuse, and logout/reset safety.
 */
jest.mock('../../modules/users/user.repo', () => ({
  findByEmail: jest.fn(),
  findByPhone: jest.fn(),
  findDocByEmail: jest.fn(),
  findDocByPhone: jest.fn(),
  findDocById: jest.fn(),
  findById: jest.fn(),
  createUser: jest.fn(),
  updateById: jest.fn(),
}));
jest.mock('../../utils/jwt', () => ({
  signToken: jest.fn(() => 'access.jwt'),
  signRefreshToken: jest.fn(() => 'refresh.jwt'),
  signAccessToken: jest.fn(() => 'access.jwt'),
  verifyRefreshToken: jest.fn(),
}));
jest.mock('../../utils/password', () => ({
  hashPassword: jest.fn(() => 'hashed'),
  comparePassword: jest.fn(),
}));
jest.mock('../../utils/verificationFlow', () => ({
  decideVerificationFlow: jest.fn(() => 'email'),
}));
jest.mock('../../cache/user.cache', () => ({
  setById: jest.fn(),
  setByEmail: jest.fn(),
  delById: jest.fn(),
  delByEmail: jest.fn(),
}));
jest.mock('../../cache/otp.cache', () => ({
  saveOtp: jest.fn(),
  deleteOtp: jest.fn(),
  incrementAttempts: jest.fn().mockResolvedValue(0),
  getOtpData: jest.fn(),
}));
jest.mock('../../queues/user.queue', () => ({
  sendEmailVerification: jest.fn(),
  sendEmailOtp: jest.fn(),
  sendSMSOtp: jest.fn(),
  logUserActivity: jest.fn(),
}));
jest.mock('../../utils/eventBus', () => ({
  emit: jest.fn(),
}));

const crypto = require('crypto');
const authService = require('../../modules/auth/auth.service');
const userRepo = require('../../modules/users/user.repo');
const jwt = require('../../utils/jwt');
const { hashPassword, comparePassword } = require('../../utils/password');
const { decideVerificationFlow } = require('../../utils/verificationFlow');
const cache = require('../../cache/user.cache');
const otpCache = require('../../cache/otp.cache');
const userQueue = require('../../queues/user.queue');
const eventBus = require('../../utils/eventBus');
const { AppError } = require('../../utils/apiResponse');

const makeUserDoc = (overrides = {}) => {
  const obj = {
    _id: 'user1',
    email: 'a@test.com',
    role: 'customer',
    authProvider: 'password',
    status: 'active',
    sessions: [],
    loginAttempts: 0,
    save: jest.fn(),
    toObject: jest.fn(function () {
      return { _id: this._id, email: this.email, role: this.role };
    }),
    ...overrides,
  };
  return obj;
};

describe('AuthService.register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects duplicate email', async () => {
    userRepo.findByEmail.mockResolvedValue({ _id: 'existing' });

    await expect(
      authService.register({
        email: 'a@test.com',
        password: 'Passw0rd!',
        role: 'customer',
        customerType: 'retail',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('creates user, caches, and triggers email verification when needed', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    decideVerificationFlow.mockReturnValue('email');
    const doc = makeUserDoc();
    userRepo.createUser.mockResolvedValue(doc);

    const res = await authService.register({
      firstName: 'John',
      lastName: 'Doe',
      email: 'a@test.com',
      password: 'Passw0rd!',
      customerType: 'retail',
    });

    expect(hashPassword).toHaveBeenCalled();
    expect(cache.setById).toHaveBeenCalledWith(doc._id, expect.any(Object));
    expect(userQueue.sendEmailVerification).toHaveBeenCalledWith(doc);
    expect(eventBus.emit).toHaveBeenCalledWith('USER_REGISTERED', {
      userId: doc._id,
    });
    expect(res).toMatchObject({ token: 'access.jwt', user: { _id: doc._id } });
  });
});

describe('AuthService.login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when provider is non-password', async () => {
    const user = makeUserDoc({ authProvider: 'google' });
    userRepo.findDocByEmail.mockResolvedValue(user);
    await expect(
      authService.login({ identifier: 'a@test.com', password: 'x' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('locks account after too many bad attempts', async () => {
    const user = makeUserDoc({
      loginAttempts: 4,
      authProvider: undefined,
      save: jest.fn().mockResolvedValue(),
    });
    userRepo.findDocByEmail.mockResolvedValue(user);
    comparePassword.mockResolvedValue(false);

    await expect(
      authService.login({ identifier: 'a@test.com', password: 'badpass' }),
    ).rejects.toBeInstanceOf(AppError);

    expect(user.save).toHaveBeenCalled();
    expect(user.loginAttempts).toBe(5);
    expect(user.lockUntil).toBeInstanceOf(Date);
  });

  it('logs in with password and issues tokens', async () => {
    const user = makeUserDoc({
      passwordHash: 'hashed',
      save: jest.fn().mockResolvedValue(),
    });
    userRepo.findDocByEmail.mockResolvedValue(user);
    comparePassword.mockResolvedValue(true);

    const res = await authService.login(
      {
        identifier: 'a@test.com',
        password: 'goodpass',
      },
      { device: 'ios' },
    );

    expect(res).toMatchObject({
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
      user: { _id: 'user1' },
    });
    expect(user.save).toHaveBeenCalled();
    expect(cache.setById).toHaveBeenCalledWith(user._id, expect.any(Object));
  });
});

describe('AuthService.refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects reused/unknown refresh token and clears sessions + cache', async () => {
    jwt.verifyRefreshToken.mockReturnValue({ userId: 'u1' });
    const user = makeUserDoc({ _id: 'u1', sessions: [], save: jest.fn().mockResolvedValue() });
    userRepo.findDocById.mockResolvedValue(user);

    await expect(authService.refresh({ refreshToken: 'stolen' })).rejects.toBeInstanceOf(
      AppError,
    );

    expect(user.save).toHaveBeenCalled();
    expect(cache.delById).toHaveBeenCalledWith('u1');
    expect(userQueue.logUserActivity).toHaveBeenCalledWith(
      'u1',
      'REFRESH_TOKEN_REUSE_DETECTED',
    );
  });
});

describe('AuthService.logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes session by refresh token hash or errors', async () => {
    userRepo.updateById.mockResolvedValue({
      _id: 'u1',
      sessions: [{ tokenHash: crypto.createHash('sha256').update('r').digest('hex') }],
      email: 'a@test.com',
    });

    const res = await authService.logout({ userId: 'u1', refreshToken: 'r' });
    expect(res).toBe(true);
    expect(cache.delById).toHaveBeenCalledWith('u1');
  });

  it('errors on invalid session', async () => {
    userRepo.updateById.mockResolvedValue(null);
    await expect(authService.logout({ userId: 'u1', refreshToken: 'x' })).rejects.toBeInstanceOf(
      AppError,
    );
  });
});

describe('AuthService.forgot/reset password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips OTP when user not found or non-password provider', async () => {
    userRepo.findDocByEmail.mockResolvedValue(null);
    await expect(
      authService.forgotPassword({ identifier: 'missing@test.com' }),
    ).resolves.toBe(true);

    userRepo.findDocByEmail.mockResolvedValue(makeUserDoc({ authProvider: 'google' }));
    await expect(
      authService.forgotPassword({ identifier: 'g@test.com' }),
    ).resolves.toBe(true);
  });

  it('rejects reset when OTP expired and clears it', async () => {
    const user = makeUserDoc({
      resetPassword: { otpHash: 'hash', expiresAt: Date.now() - 1000, attempts: 0 },
    });
    userRepo.findDocByEmail.mockResolvedValue(user);

    await expect(
      authService.resetPassword({
        identifier: 'a@test.com',
        otp: '123456',
        newPassword: 'Newpass1!',
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(user.resetPassword).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
  });
});
