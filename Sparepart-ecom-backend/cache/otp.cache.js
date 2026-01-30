const crypto = require('crypto');
const { redis } = require('../config/redis');
const { jsonGet, jsonSet } = require('./cacheUtils');
const keys = require('../lib/cache/keys');

const OTP_TTL = 300; // 5 minutes
const MAX_ATTEMPTS = 5;

const key = (identifier) => keys.otp(identifier);

// Hash helper function for OTP security
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

const saveOtp = async (identifier, otp) => {
  const payload = {
    otpHash: hash(otp),
    attempts: 0,
  };

  await jsonSet(key(identifier), payload, OTP_TTL);
};

const getOtpData = async (identifier) => jsonGet(key(identifier));

const incrementAttempts = async (identifier) => {
  const data = await getOtpData(identifier);
  if (!data) return null;

  data.attempts += 1;
  if (data.attempts > MAX_ATTEMPTS) return data.attempts;

  await jsonSet(key(identifier), data, OTP_TTL);
  return data.attempts;
};

const deleteOtp = async (identifier) => {
  if (!redis.isOpen) return;
  await redis.del(key(identifier));
};

module.exports = {
  saveOtp,
  getOtpData,
  incrementAttempts,
  deleteOtp,
};
