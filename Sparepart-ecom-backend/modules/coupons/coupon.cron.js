const cron = require('node-cron');
const { expireCoupons, fraudUsageAudit } = require('./coupon.jobs');

const scheduleCouponExpiry = () => {
  // Runs hourly
  cron.schedule('0 * * * *', async () => {
    await expireCoupons();
  });

  // Runs daily at 2am server time
  cron.schedule('0 2 * * *', async () => {
    await fraudUsageAudit();
  });
};

module.exports = { scheduleCouponExpiry };
