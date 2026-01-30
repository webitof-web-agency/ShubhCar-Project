const CouponUsage = require('../../models/CouponUsage.model');

class CouponUsageRepo {
  list(filter = {}) {
    return CouponUsage.find(filter).sort({ createdAt: -1 }).lean();
  }
}

module.exports = new CouponUsageRepo();
