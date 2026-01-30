const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const userRepo = require('../users/user.repo');
const {
  signToken,
  verifyRefreshToken,
  signRefreshToken,
  signAccessToken,
} = require('../../utils/jwt');
const { error } = require('../../utils/apiResponse');
const env = require('../../config/env');
const { hashPassword, comparePassword } = require('../../utils/password');
const { decideVerificationFlow } = require('../../utils/verificationFlow');
const cache = require('../../cache/user.cache');
const eventBus = require('../../utils/eventBus');
const ROLES = require('../../constants/roles');
const {
  sendEmailVerification,
  sendEmailOtp,
  sendSMSOtp,
  logUserActivity,
} = require('../../queues/user.queue');

const {
  registerSchema,
  loginSchema,
  refreshSchema, // kept for symmetry; controller validates
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('./auth.validator');
const {
  saveOtp,
  deleteOtp,
  incrementAttempts,
  getOtpData,
} = require('../../cache/otp.cache');

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

const randomOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

class AuthService {
  /* =======================
     PHONE OTP FLOW
  ======================== */
  async sendPhoneOtp(phone) {
    if (!phone) error('Phone is required', 400);
    const otp = randomOtp();
    await saveOtp(phone, otp);
    await sendSMSOtp({ phone, otp });
    return true;
  }

  async sendEmailOtp(email) {
    if (!email) error('Email is required', 400);
    const otp = randomOtp();
    await saveOtp(email, otp);
    if (typeof sendEmailOtp === 'function') {
      await sendEmailOtp({ email, otp });
    } else if (typeof sendEmailVerification === 'function') {
      await sendEmailVerification({ email, otp });
    }
    return true;
  }

  // Backwards-compatible aliases used in tests
  async sendOtp(emailOrPayload) {
    const email =
      typeof emailOrPayload === 'string'
        ? emailOrPayload
        : emailOrPayload?.identifier || emailOrPayload?.email;
    return this.sendEmailOtp(email);
  }

  async verifyPhoneOtp(payload, meta = {}) {
    const { phone, otp, firstName, lastName, customerType } = payload;
    const data = await getOtpData(phone);
    if (!data) error('OTP expired or invalid', 400);

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpHash !== data.otpHash) {
      const attempts = await incrementAttempts(phone);
      if (attempts >= 5) {
        await deleteOtp(phone);
        error('Too many attempts. OTP expired.', 429);
      }
      error('Invalid OTP', 400);
    }

    await deleteOtp(phone);

    let user = await userRepo.findDocByPhone(phone);

    if (!user) {
      const created = await userRepo.createUser({
        phone,
        firstName: firstName || 'User',
        lastName: lastName || '',
        customerType: customerType || 'retail',
        role: ROLES.CUSTOMER,
        authProvider: 'phone_otp',
        phoneVerified: true,
        verificationStatus: 'approved',
        status: 'active',
      });
      user = await userRepo.findDocById(created._id);
    } else {
      if (user.status !== 'active') error('Account disabled', 403);
      user.authProvider = user.authProvider || 'phone_otp';
      user.phoneVerified = true;
      user.verificationStatus = 'approved';
    }

    return this.#issueSession(user, { ...meta, method: 'phone_otp' });
  }

  async verifyEmailOtp(payload, meta = {}) {
    const { email, otp, firstName, lastName, customerType } = payload;
    if (!email) error('Email is required', 400);
    const data = await getOtpData(email);
    if (!data) error('OTP expired or invalid', 400);

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpHash !== data.otpHash) {
      const attempts = await incrementAttempts(email);
      if (attempts >= 5) {
        await deleteOtp(email);
        error('Too many attempts. OTP expired.', 429);
      }
      error('Invalid OTP', 400);
    }

    await deleteOtp(email);

    let user = await userRepo.findDocByEmail(email.toLowerCase());

    if (!user) {
      const created = await userRepo.createUser({
        email: email.toLowerCase(),
        firstName: firstName || 'User',
        lastName: lastName || '',
        customerType: customerType || 'retail',
        role: ROLES.CUSTOMER,
        authProvider: 'email_otp',
        emailVerified: true,
        verificationStatus: 'approved',
        status: 'active',
      });
      user = await userRepo.findDocById(created._id);
    } else {
      if (user.status !== 'active') error('Account disabled', 403);
      user.authProvider = user.authProvider || 'email_otp';
      user.emailVerified = true;
      user.verificationStatus = 'approved';
    }

    return this.#issueSession(user, { ...meta, method: 'email_otp' });
  }

  // Backwards-compatible alias used in tests
  async verifyOtp(payload, meta = {}) {
    const identifier =
      typeof payload === 'string'
        ? payload
        : payload?.identifier || payload?.email;
    const otp = typeof payload === 'string' ? null : payload?.otp;

    const data = await getOtpData(identifier);
    if (!data) error('OTP expired or invalid', 400);

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpHash !== data.otpHash) {
      await incrementAttempts(identifier);
      error('Invalid OTP', 400);
    }

    await deleteOtp(identifier);
    return true;
  }

  /* =======================
     GOOGLE OAUTH FLOW
  ======================== */
  async googleAuth(idToken, meta = {}) {
    if (!googleClient) error('Google auth not configured', 500);

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      error('Invalid Google token', 401);
    }

    if (!payload?.email) error('Google account missing email', 400);
    const email = payload.email.toLowerCase();

    let user = await userRepo.findDocByEmail(email);

    if (!user) {
      const created = await userRepo.createUser({
        firstName: payload.given_name || payload.name || 'User',
        lastName: payload.family_name || '',
        email,
        role: ROLES.CUSTOMER,
        customerType: 'retail',
        authProvider: 'google',
        // Google OAuth verifies ownership; keep verificationStatus informational.
        emailVerified: true,
        verificationStatus: 'approved',
        status: 'active',
      });
      user = await userRepo.findDocById(created._id);
    } else {
      if (user.status !== 'active') error('Account disabled', 403);
      user.authProvider = user.authProvider || 'google';
      user.emailVerified = true;
      user.verificationStatus = 'approved';
    }

    return this.#issueSession(user, { ...meta, method: 'google' });
  }

  /* =======================
     PASSWORD FLOWS
  ======================== */
  async register(payload) {
    const { error: err, value } = registerSchema.validate(payload, {
      abortEarly: false,
    });
    if (err) error(err.details.map((d) => d.message).join(', '));

    const { email, phone, password, customerType } = value;

    const existing =
      (email && (await userRepo.findByEmail(email))) ||
      (phone && (await userRepo.findByPhone(phone)));
    if (existing) error('User already exists', 409);

    const passwordHash = await hashPassword(password);
    const verificationFlow = decideVerificationFlow({ email, phone });

    const user = await userRepo.createUser({
      ...value,
      passwordHash,
      verificationStatus:
        verificationFlow === 'none' ? 'not_required' : 'pending',
      role: ROLES.CUSTOMER,
      customerType,
      status: 'active',
      authProvider: 'password',
    });

    const safeUser = { ...(user.toObject?.() ? user.toObject() : user) };
    delete safeUser.passwordHash;

    await cache.setById(user._id, safeUser);
    if (email) await cache.setByEmail(email, safeUser);

    await logUserActivity(user._id, 'USER_REGISTERED');
    eventBus.emit('USER_REGISTERED', { userId: user._id });

    // Send verification email/SMS (non-blocking - don't fail registration if this fails)
    if (verificationFlow === 'email') {
      try {
        await sendEmailVerification(user);
      } catch (emailError) {
        console.error('[AUTH] Email verification send failed:', emailError.message);
        // Continue registration even if email fails
      }
    } else if (verificationFlow === 'sms') {
      try {
        await sendSMSOtp(user);
      } catch (smsError) {
        console.error('[AUTH] SMS verification send failed:', smsError.message);
        // Continue registration even if SMS fails
      }
    }

    const token = signToken(
      { userId: user._id, role: user.role },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN,
    );

    return { token, user: safeUser };
  }

  async login(payload, meta = {}) {
    const { error: err, value } = loginSchema.validate(payload);
    if (err) error(err.details.map((d) => d.message).join(', '));

    const identifier = value.identifier || value.email || value.phone;
    const { password } = value;
    const isEmailIdentifier = identifier.includes('@');

    const user = isEmailIdentifier
      ? await userRepo.findDocByEmail(identifier)
      : await userRepo.findDocByPhone(identifier);

    if (!user) error(isEmailIdentifier ? 'Email is wrong' : 'Invalid credentials', 401);

    if (user.authProvider && user.authProvider !== 'password') {
      error('Use OTP or Google login for this account', 400);
    }

    if (user.status !== 'active') {
      error('Account disabled', 403);
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      error('Account temporarily locked. Try again later.', 423);
    }

    const ok = await comparePassword(password, user.passwordHash || '');
    if (!ok) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      }

      await user.save();
      error(isEmailIdentifier ? 'Email is Ok but password is wrong' : 'Invalid credentials', 401);
    }

    user.loginAttempts = 0;
    user.lockUntil = null;

    return this.#issueSession(user, { ...meta, method: 'password' });
  }

  /* =======================
     TOKENS / SESSIONS
  ======================== */
  async refresh({ refreshToken }) {
    if (!refreshToken) error('Missing refresh token', 401);

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      error('Invalid refresh token', 401);
    }

    const user = await userRepo.findDocById(payload.userId);
    if (!user) error('Invalid token', 401);

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = user.sessions.find((s) => s.tokenHash === hash);

    if (!session) {
      user.sessions = [];
      await user.save();

      await cache.delById(user._id);
      if (user.email) await cache.delByEmail(user.email);

      await logUserActivity(user._id, 'REFRESH_TOKEN_REUSE_DETECTED');

      error('Session compromised. Please login again.', 401);
    }

    if (session.expiresAt && session.expiresAt < Date.now()) {
      user.sessions = user.sessions.filter((s) => s.tokenHash !== hash);
      await user.save();

      error('Session expired. Please login again.', 401);
    }

    user.sessions = user.sessions.filter((s) => s.tokenHash !== hash);

    const newRefreshToken = signRefreshToken({ userId: user._id });
    const newHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    user.sessions.push({
      tokenHash: newHash,
      device: session.device,
      ip: session.ip,
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await user.save();

    await cache.delById(user._id);
    if (user.email) await cache.delByEmail(user.email);
    if (user.phone) await cache.delByPhone(user.phone);

    await logUserActivity(user._id, 'TOKEN_REFRESHED');

    return {
      accessToken: signAccessToken({
        userId: user._id,
        role: user.role,
      }),
      refreshToken: newRefreshToken,
    };
  }

  async logout({ userId, refreshToken }) {
    if (!refreshToken) error('Refresh token required', 400);

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const result = await userRepo.updateById(userId, {
      $pull: { sessions: { tokenHash: hash } },
    });

    if (!result || result.sessions?.length === undefined) {
      error('Invalid or expired session', 401);
    }

    await cache.delById(userId);
    if (result.email) await cache.delByEmail(result.email);
    if (result.phone) await cache.delByPhone(result.phone);

    await logUserActivity(userId, 'USER_LOGOUT');

    return true;
  }

  async logoutAll(userId) {
    const user = await userRepo.findDocById(userId);
    if (!user) error('User not found', 404);

    if (!user.sessions.length) return true;

    user.sessions = [];
    await user.save();

    await cache.delById(userId);
    if (user.email) await cache.delByEmail(user.email);
    if (user.phone) await cache.delByPhone(user.phone);

    await logUserActivity(userId, 'USER_LOGOUT_ALL');

    return true;
  }

  /* =======================
     PASSWORD RESET
  ======================== */
  async forgotPassword(payload) {
    const { error: err, value } = forgotPasswordSchema.validate(payload);
    if (err) error(err.details.map((d) => d.message).join(', '));

    const identifier = value.identifier;

    const user = identifier.includes('@')
      ? await userRepo.findDocByEmail(identifier)
      : await userRepo.findDocByPhone(identifier);

    if (!user) {
      return true;
    }

    if (user.authProvider && user.authProvider !== 'password') {
      return true; // do not issue OTPs for non-password accounts
    }

    const otp = randomOtp();

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPassword = {
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    };

    await user.save();

    if (user.email) {
      await sendEmailOtp({ email: user.email, otp });
    } else if (user.phone) {
      await sendSMSOtp({ phone: user.phone, otp });
    }

    await logUserActivity(user._id, 'FORGOT_PASSWORD_OTP_SENT');

    return true;
  }

  async resetPassword(payload) {
    const { error: err, value } = resetPasswordSchema.validate(payload);
    if (err) error(err.details.map((d) => d.message).join(', '));

    const { identifier, otp, newPassword } = value;

    const user = identifier.includes('@')
      ? await userRepo.findDocByEmail(identifier)
      : await userRepo.findDocByPhone(identifier);

    if (!user || !user.resetPassword?.otpHash) {
      error('Invalid or expired OTP', 400);
    }

    if (user.resetPassword.expiresAt < Date.now()) {
      user.resetPassword = undefined;
      await user.save();
      error('OTP expired', 400);
    }

    if (user.resetPassword.attempts >= 5) {
      user.resetPassword = undefined;
      await user.save();
      error('Too many attempts', 429);
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    if (otpHash !== user.resetPassword.otpHash) {
      user.resetPassword.attempts += 1;
      await user.save();
      error('Invalid OTP', 400);
    }

    user.passwordHash = await hashPassword(newPassword);

    user.sessions = [];
    user.resetPassword = undefined;

    await user.save();

    await cache.delById(user._id);
    if (user.email) await cache.delByEmail(user.email);
    if (user.phone) await cache.delByPhone(user.phone);

    await logUserActivity(user._id, 'PASSWORD_RESET_SUCCESS');

    return true;
  }

  /* =======================
     INTERNAL
  ======================== */
  async #issueSession(user, meta = {}) {
    const accessToken = signAccessToken({
      userId: user._id,
      role: user.role,
    });

    const refreshToken = signRefreshToken({
      userId: user._id,
    });

    const refreshHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    user.sessions = user.sessions || [];
    user.sessions.push({
      tokenHash: refreshHash,
      device: meta.device || 'unknown',
      ip: meta.ip,
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    user.loginAttempts = 0;
    user.lockUntil = null;

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    delete safeUser.sessions;

    await cache.setById(user._id, safeUser);
    if (safeUser.email) await cache.setByEmail(safeUser.email);

    await logUserActivity(user._id, 'USER_LOGIN', {
      method: meta.method || 'password',
      ip: meta.ip,
      device: meta.device,
    });

    return {
      accessToken,
      refreshToken,
      user: safeUser,
    };
  }
}

module.exports = new AuthService();
