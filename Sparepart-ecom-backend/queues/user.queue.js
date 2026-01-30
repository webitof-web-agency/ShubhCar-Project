const logger = require('../config/logger');
const { sendSMS } = require('../utils/sms');
const { generateOtp } = require('../utils/otp');
const { saveOtp } = require('../cache/otp.cache');
const emailNotification = require('../services/emailNotification.service');

/* =========================
   EMAIL VERIFICATION
========================= */
const sendEmailVerification = async (user) => {
  if (!user?.email) return;

  const otp = generateOtp();
  await saveOtp(user.email, otp);

  await emailNotification.send({
    templateName: 'auth_email_verification',
    to: user.email,
    variables: {
      firstName: user.firstName || 'User',
      otp,
      appName: process.env.APP_NAME || 'App',
    },
  });

  logger.info(`Email verification sent to ${user.email}`);
};

/* =========================
    OTP
========================= */
const sendSMSOtp = async ({ phone, otp: otpInput }) => {
  const phoneNumber = typeof phone === 'string' ? phone : phone?.phone;
  if (!phoneNumber) return;

  const otp = otpInput || generateOtp();
  await saveOtp(phoneNumber, otp);

  const message = `Your OTP is ${otp}. Valid for 5 minutes.`;

  try {
    await sendSMS(phoneNumber, message);
    logger.info(`SMS OTP sent to ${phoneNumber}`);
  } catch (err) {
    logger.error('SMS OTP failed', err);
    throw err;
  }
};

const sendEmailOtp = async ({ email, otp: otpInput }) => {
  if (!email) return;

  const otp = otpInput || generateOtp();
  await saveOtp(email, otp);

  await emailNotification.send({
    templateName: 'forgot_password_otp',
    to: email,
    variables: { otp, appName: process.env.APP_NAME || 'App' },
  });

  logger.info(`Forgot-password OTP sent to ${email}`);
};

/* =========================
   USER ACTIVITY LOG
========================= */
const logUserActivity = async (userId, activity, meta = {}) => {
  logger.info('USER_ACTIVITY', {
    userId,
    activity,
    meta,
    at: new Date().toISOString(),
  });
};

module.exports = {
  sendEmailVerification,
  sendEmailOtp,
  sendSMSOtp,
  logUserActivity,
};
