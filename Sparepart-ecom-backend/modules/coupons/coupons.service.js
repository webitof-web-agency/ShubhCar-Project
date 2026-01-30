const couponRepo = require('./coupon.repo');
const couponUsageRepo = require('./couponUsage.repo');
const { error } = require('../../utils/apiResponse');

class CouponsService {
  async preview({ userId, code, orderSubtotal, session }) {
    const upper = code.toUpperCase();
    const now = new Date();

    let coupon = await couponRepo.getCachedCoupon(upper);
    if (!coupon) {
      coupon = await couponRepo.findByCode(upper);
      if (coupon) await couponRepo.cacheCoupon(coupon);
    }

    if (!coupon) error('Invalid coupon', 400);
    if (!coupon.isActive) error('Coupon inactive', 400);
    if (coupon.validFrom && now < new Date(coupon.validFrom))
      error('Coupon not active yet', 400);
    if (coupon.validTo && now > new Date(coupon.validTo))
      error('Coupon expired', 400);
    if (coupon.minOrderAmount && orderSubtotal < coupon.minOrderAmount) {
      error('Order does not meet coupon minimum', 400);
    }

    const usageTotal = await couponRepo.countUsageTotal(coupon._id, session);
    if (coupon.usageLimitTotal && usageTotal >= coupon.usageLimitTotal) {
      error('Coupon usage limit reached', 400);
    }
    const usageUser = await couponRepo.countUsageByUser(
      coupon._id,
      userId,
      session,
    );
    if (coupon.usageLimitPerUser && usageUser >= coupon.usageLimitPerUser) {
      error('Coupon user limit reached', 400);
    }

    const rawDiscount =
      coupon.discountType === 'percent'
        ? (orderSubtotal * coupon.discountValue) / 100
        : coupon.discountValue;
    const cappedDiscount =
      coupon.maxDiscountAmount && rawDiscount > coupon.maxDiscountAmount
        ? coupon.maxDiscountAmount
        : rawDiscount;

    const discountAmount = Math.min(cappedDiscount, orderSubtotal);
    const finalPayable = orderSubtotal - discountAmount;

    return {
      couponId: coupon._id,
      code: coupon.code,
      discountAmount,
      finalPayable,
    };
  }

  async create(data) {
    const exists = await couponRepo.findByCode(data.code);
    if (exists) error('Coupon code already exists', 400);
    const created = await couponRepo.create(data);
    await couponRepo.invalidateCache(created.code);
    return created;
  }

  async update(id, data) {
    const updated = await couponRepo.update(id, data);
    if (!updated) error('Coupon not found', 404);
    return updated;
  }

  async remove(id) {
    const deleted = await couponRepo.remove(id);
    if (!deleted) error('Coupon not found', 404);
    return deleted;
  }

  list() {
    return couponRepo.list();
  }

  listPublic() {
    const now = new Date();
    return couponRepo.list({
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    });
  }

  get(id) {
    return couponRepo.findById(id);
  }

  async listUsage(filter = {}) {
    return couponUsageRepo.list(filter);
  }

  async validate({ code, userId, orderAmount, session }) {
    const result = await this.preview({
      userId,
      code,
      orderSubtotal: orderAmount,
      session,
    });

    return {
      couponId: result.couponId,
      couponCode: result.code,
      discountAmount: result.discountAmount,
    };
  }
}

module.exports = new CouponsService();
