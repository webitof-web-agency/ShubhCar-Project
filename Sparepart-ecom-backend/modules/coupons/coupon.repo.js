const Coupon = require('../../models/Coupon.model');
const CouponUsage = require('../../models/CouponUsage.model');
const { redis } = require('../../config/redis');

class CouponRepository {
  cacheKey(code) {
    return `coupon:${code.toUpperCase()}`;
  }

  async getCachedCoupon(code) {
    const raw = await redis.get(this.cacheKey(code));
    return raw ? JSON.parse(raw) : null;
  }

  async cacheCoupon(coupon) {
    if (!coupon) return;
    const key = this.cacheKey(coupon.code);
    const now = Date.now();
    const ttlMs =
      coupon.validTo instanceof Date
        ? Math.max(coupon.validTo.getTime() - now, 0)
        : 0;
    const ttlSeconds = Math.max(
      60,
      Math.min(600, Math.floor(ttlMs / 1000) || 300),
    );
    await redis.setEx(
      key,
      ttlSeconds,
      JSON.stringify({
        _id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        usageLimitTotal: coupon.usageLimitTotal,
        usageLimitPerUser: coupon.usageLimitPerUser,
        isActive: coupon.isActive,
        validFrom: coupon.validFrom,
        validTo: coupon.validTo,
      }),
    );
  }

  async invalidateCache(code) {
    if (!code) return;
    await redis.del(this.cacheKey(code));
  }

  findByCode(code) {
    return Coupon.findOne({ code: code.toUpperCase(), isActive: true }).lean();
  }

  findById(id) {
    return Coupon.findById(id).lean();
  }

  list(filter = {}) {
    return Coupon.find(filter).sort({ createdAt: -1 }).lean();
  }

  create(data) {
    return Coupon.create(data);
  }

  async update(id, data) {
    const updated = await Coupon.findByIdAndUpdate(id, data, {
      new: true,
    }).lean();
    if (updated) await this.invalidateCache(updated.code);
    return updated;
  }

  async remove(id) {
    const found = await Coupon.findById(id);
    if (!found) return null;
    await this.invalidateCache(found.code);
    return Coupon.findByIdAndDelete(id).lean();
  }

  countUsageTotal(couponId, session) {
    const query = CouponUsage.countDocuments({ couponId });
    if (session) query.session(session);
    return query;
  }

  countUsageByUser(couponId, userId, session) {
    const query = CouponUsage.countDocuments({ couponId, userId });
    if (session) query.session(session);
    return query;
  }

  findUsageByOrder(orderId) {
    return CouponUsage.findOne({ orderId }).lean();
  }

  async recordUsage({ couponId, userId, orderId }, session) {

    return CouponUsage.updateOne(
      { orderId },
      {
        $setOnInsert: {
          couponId,
          userId,
          orderId,
          usedAt: new Date(),
        },
      },
      { upsert: true, session },
    );
  }

  removeUsageByOrder(orderId, session) {
    const query = CouponUsage.deleteMany({ orderId });
    if (session) query.session(session);
    return query;
  }

  async lockCoupon({
    couponId,
    userId,
    sessionId,
    ttlSeconds = 1800,
    scope = 'user',
  }) {
    if (!couponId) return false;
    if (!redis?.isOpen) return true;

    const owner = scope === 'coupon' ? 'global' : userId || sessionId;
    if (!owner) return false;

    const key =
      scope === 'coupon'
        ? `coupon:lock:${couponId}`
        : `coupon:lock:${couponId}:${owner}`;
    const result = await redis.set(key, '1', { NX: true, EX: ttlSeconds });
    return result === 'OK';
  }

  async unlockCoupon({ couponId, userId, sessionId, scope = 'user' }) {
    if (!couponId) return 0;
    if (!redis?.isOpen) return 0;

    const owner = scope === 'coupon' ? 'global' : userId || sessionId;
    if (!owner) return 0;

    const key =
      scope === 'coupon'
        ? `coupon:lock:${couponId}`
        : `coupon:lock:${couponId}:${owner}`;
    return redis.del(key);
  }
}

module.exports = new CouponRepository();
