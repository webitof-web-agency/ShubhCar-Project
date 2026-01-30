// Export individual handlers to be mounted with gateway-specific body parsing.
const controller = require('./webhooks.controller');

module.exports = {
  stripe: controller.stripe.bind(controller),
  razorpay: controller.razorpay.bind(controller),
};
