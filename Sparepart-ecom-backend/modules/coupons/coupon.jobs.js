const Coupon = require('../../models/Coupon.model');
const logger = require('../../config/logger');
const CouponUsage = require('../../models/CouponUsage.model');
const Order = require('../../models/Order.model');

const expireCoupons = async () => {
  const now = new Date();
  const res = await Coupon.updateMany(
    { validTo: { $lt: now }, isActive: true },
    { isActive: false },
  );
  if (res.modifiedCount) {
    logger.info(`Expired coupons deactivated: ${res.modifiedCount}`);
  }
};

const fraudUsageAudit = async () => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Detect high-frequency usage by same user on same coupon in last 24h
  const heavyUsers = await CouponUsage.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { couponId: '$couponId', userId: '$userId' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 3 } } },
  ]);

  // Detect cancelled orders that used coupons in last 7d
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const cancelledWithCoupons = await Order.find({
    couponId: { $exists: true, $ne: null },
    orderStatus: 'cancelled',
    updatedAt: { $gte: sevenDaysAgo },
  })
    .select('_id couponId userId')
    .lean();

  if (heavyUsers.length || cancelledWithCoupons.length) {
    logger.warn('Coupon fraud audit findings', {
      heavyUsers,
      cancelledWithCoupons,
    });
  } else {
    logger.info('Coupon fraud audit complete: no findings');
  }
};

module.exports = { expireCoupons, fraudUsageAudit };
