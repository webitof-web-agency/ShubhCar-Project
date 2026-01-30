const logger = require('../config/logger');

const sendSMS = async (phone, message) => {
  // 🔌 Plug MSG91 / Twilio / Fast2SMS here
  logger.info(`📲 SMS sent to ${phone}: ${message}`);
};

module.exports = { sendSMS };
