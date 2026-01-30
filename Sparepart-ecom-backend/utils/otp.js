const crypto = require('crypto');
exports.generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

exports.generateOtpHash = (otp) =>
  crypto.createHash('sha256').update(otp).digest('hex');
