const authService = require('../modules/auth/auth.service');
const userRepo = require('../modules/users/user.repo');
const jwt = require('../utils/jwt');
const passwordUtils = require('../utils/password');
const verificationFlow = require('../utils/verificationFlow');
const userCache = require('../cache/user.cache');
const otpCache = require('../cache/otp.cache');
const userQueue = require('../queues/user.queue');
const eventBus = require('../utils/eventBus');
const env = require('../config/env');
const { AppError } = require('../utils/apiResponse');

jest.mock('../modules/users/user.repo', () => ({
  findByEmail: jest.fn(),
  findByPhone: jest.fn(),
  findDocByEmail: jest.fn(),
  findDocByPhone: jest.fn(),
  findDocById: jest.fn(),
  createUser: jest.fn(),
  updateById: jest.fn(),
}));

jest.mock('../utils/jwt', () => ({
  signToken: jest.fn(),
  signRefreshToken: jest.fn(),
  signAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

jest.mock('../utils/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock('../utils/verificationFlow', () => ({
  decideVerificationFlow: jest.fn(),
}));

jest.mock('../cache/user.cache', () => ({
  setById: jest.fn(),
  setByEmail: jest.fn(),
  delById: jest.fn(),
  delByEmail: jest.fn(),
}));

jest.mock('../cache/otp.cache', () => ({
  saveOtp: jest.fn(),
  deleteOtp: jest.fn(),
  incrementAttempts: jest.fn(),
  getOtpData: jest.fn(),
}));

jest.mock('../queues/user.queue', () => ({
  sendEmailVerification: jest.fn(),
  sendSMSOtp: jest.fn(),
  logUserActivity: jest.fn(),
}));

jest.mock('../utils/eventBus', () => ({
  emit: jest.fn(),
}));

// Provide needed env values
jest.mock('../config/env', () => ({
  JWT_SECRET: 'secret',
  JWT_EXPIRES_IN: '15m',
}));

describe('AuthService.register', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('throws when user already exists (email or phone)', async () => {
    userRepo.findByEmail.mockResolvedValue({ _id: 'u1' });
    await expect(
      authService.register({
        firstName: 'Alice',
        email: 'a@test.com',
        phone: '9876543210',
        password: 'pass1234',
        customerType: 'retail',
      }),
    ).rejects.toMatchObject({ message: 'User already exists', statusCode: 409 });
  });

  test('creates user, caches, and returns token + safe user', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.findByPhone.mockResolvedValue(null);
    passwordUtils.hashPassword.mockResolvedValue('hashed');
    verificationFlow.decideVerificationFlow.mockReturnValue('email');
    const userDoc = {
      _id: 'u2',
      role: 'customer',
      email: 'b@test.com',
      toObject() {
        return { _id: this._id, role: this.role, email: this.email, passwordHash: 'hashed' };
      },
    };
    userRepo.createUser.mockResolvedValue(userDoc);
    jwt.signToken.mockReturnValue('token');

    const result = await authService.register({
      firstName: 'Bob',
      email: 'b@test.com',
      password: 'pass1234',
      customerType: 'retail',
    });

    expect(userRepo.createUser).toHaveBeenCalled();
    expect(userCache.setById).toHaveBeenCalledWith('u2', expect.objectContaining({ _id: 'u2' }));
    expect(jwt.signToken).toHaveBeenCalledWith(
      { userId: 'u2', role: 'customer' },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN,
    );
    expect(result).toEqual({
      token: 'token',
      user: { _id: 'u2', role: 'customer', email: 'b@test.com' },
    });
  });
});

describe('AuthService.login', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('rejects invalid credentials', async () => {
    userRepo.findDocByEmail.mockResolvedValue(null);
    await expect(
      authService.login({ identifier: 'a@test.com', password: 'invalid' }),
    ).rejects.toMatchObject({ message: 'Invalid credentials', statusCode: 401 });
  });

  test('rejects disabled account', async () => {
    const user = { status: 'inactive' };
    userRepo.findDocByEmail.mockResolvedValue(user);
    await expect(
      authService.login({ identifier: 'a@test.com', password: 'invalid' }),
    ).rejects.toMatchObject({ message: 'Account disabled', statusCode: 403 });
  });

  test('locks after failed attempts', async () => {
    const save = jest.fn();
    const user = {
      status: 'active',
      loginAttempts: 4,
      save,
    };
    userRepo.findDocByEmail.mockResolvedValue(user);
    passwordUtils.comparePassword.mockResolvedValue(false);

    await expect(
      authService.login({ identifier: 'a@test.com', password: 'badpwd' }),
    ).rejects.toMatchObject({ message: 'Invalid credentials', statusCode: 401 });
    expect(user.loginAttempts).toBe(5);
    expect(user.lockUntil).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalled();
  });

  test('authenticates and issues tokens', async () => {
    const save = jest.fn();
    const user = {
      _id: 'u1',
      role: 'customer',
      status: 'active',
      loginAttempts: 0,
      sessions: [],
      save,
      toObject() {
        return { _id: this._id, role: this.role };
      },
    };
    userRepo.findDocByEmail.mockResolvedValue(user);
    passwordUtils.comparePassword.mockResolvedValue(true);
    jwt.signAccessToken.mockReturnValue('access');
    jwt.signRefreshToken.mockReturnValue('refresh');

    const result = await authService.login({
      identifier: 'a@test.com',
      password: 'goodpwd',
    });

    expect(jwt.signAccessToken).toHaveBeenCalledWith({ userId: 'u1', role: 'customer' });
    expect(jwt.signRefreshToken).toHaveBeenCalledWith({ userId: 'u1' });
    expect(user.sessions[0]).toMatchObject({ tokenHash: expect.any(String) });
    expect(save).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { _id: 'u1', role: 'customer' },
    });
  });
});

describe('AuthService.refresh', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('rejects missing token', async () => {
    await expect(authService.refresh({})).rejects.toMatchObject({
      message: 'Missing refresh token',
      statusCode: 401,
    });
  });

  test('rejects compromised session (token reuse)', async () => {
    jwt.verifyRefreshToken.mockReturnValue({ userId: 'u1' });
    const save = jest.fn();
    const user = { _id: 'u1', sessions: [], save, email: 'a@test.com' };
    userRepo.findDocById.mockResolvedValue(user);

    await expect(authService.refresh({ refreshToken: 'old' })).rejects.toMatchObject({
      message: 'Session compromised. Please login again.',
      statusCode: 401,
    });
    expect(user.sessions).toEqual([]);
    expect(save).toHaveBeenCalled();
  });

  test('rotates session and returns new tokens', async () => {
    jwt.verifyRefreshToken.mockReturnValue({ userId: 'u1' });
    const save = jest.fn();
    const hash = require('crypto').createHash('sha256').update('old').digest('hex');
    const user = {
      _id: 'u1',
      email: 'a@test.com',
      role: 'customer',
      sessions: [{ tokenHash: hash, device: 'web', ip: '1.1.1.1', expiresAt: new Date(Date.now() + 10000) }],
      save,
    };
    userRepo.findDocById.mockResolvedValue(user);
    jwt.signAccessToken.mockReturnValue('newAccess');
    jwt.signRefreshToken.mockReturnValue('newRefresh');

    const result = await authService.refresh({ refreshToken: 'old' });

    expect(user.sessions[0]).toMatchObject({ tokenHash: expect.any(String), device: 'web' });
    expect(userCache.delById).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ accessToken: 'newAccess', refreshToken: 'newRefresh' });
  });
});

describe('AuthService.logout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('requires refresh token', async () => {
    await expect(authService.logout({ userId: 'u1' })).rejects.toMatchObject({
      message: 'Refresh token required',
      statusCode: 400,
    });
  });

  test('logs out and clears cache', async () => {
    userRepo.updateById.mockResolvedValue({ sessions: [{}], email: 'a@test.com' });

    const result = await authService.logout({ userId: 'u1', refreshToken: 'tok' });

    expect(userRepo.updateById).toHaveBeenCalled();
    expect(userCache.delById).toHaveBeenCalledWith('u1');
    expect(result).toBe(true);
  });
});

describe('AuthService.logoutAll', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('rejects when user not found', async () => {
    userRepo.findDocById.mockResolvedValue(null);
    await expect(authService.logoutAll('missing')).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });
  });

  test('clears sessions and cache', async () => {
    const save = jest.fn();
    const user = { _id: 'u1', email: 'a@test.com', sessions: [{}, {}], save };
    userRepo.findDocById.mockResolvedValue(user);

    const result = await authService.logoutAll('u1');

    expect(user.sessions).toHaveLength(0);
    expect(save).toHaveBeenCalled();
    expect(userCache.delById).toHaveBeenCalledWith('u1');
    expect(result).toBe(true);
  });
});

describe('AuthService.sendOtp & verifyOtp', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('sends email OTP', async () => {
    await authService.sendOtp('a@test.com');
    expect(otpCache.saveOtp).toHaveBeenCalled();
    expect(userQueue.sendEmailVerification).toHaveBeenCalled();
  });

  test('verifies valid OTP and clears cache', async () => {
    const identifier = 'user1';
    const otp = '123456';
    const otpHash = require('crypto').createHash('sha256').update(otp).digest('hex');
    otpCache.getOtpData.mockResolvedValue({ otpHash, attempts: 0 });
    otpCache.deleteOtp.mockResolvedValue(true);

    const result = await authService.verifyOtp({ identifier, otp });

    expect(otpCache.deleteOtp).toHaveBeenCalledWith(identifier);
    expect(result).toBe(true);
  });

  test('rejects invalid OTP and increments attempts', async () => {
    otpCache.getOtpData.mockResolvedValue({ otpHash: 'wrong', attempts: 0 });
    otpCache.incrementAttempts.mockResolvedValue(1);

    await expect(
      authService.verifyOtp({ identifier: 'user1', otp: '000000' }),
    ).rejects.toMatchObject({ message: 'Invalid OTP', statusCode: 400 });
    expect(otpCache.incrementAttempts).toHaveBeenCalled();
  });
});
