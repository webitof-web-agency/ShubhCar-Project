const repo = require('./reviews.repo');
const { error } = require('../../utils/apiResponse');
const reviewCache = require('../../cache/review.cache');
const OrderItem = require('../../models/OrderItem.model');
const Product = require('../../models/Product.model');
const ROLES = require('../../constants/roles');
const { ORDER_STATUS } = require('../../constants/orderStatus');

class ReviewsService {
  async listByProduct(productId) {
    const cached = await reviewCache.get(reviewCache.key.product(productId));
    if (cached) return cached;

    const list = await repo.findByProduct(productId);
    const normalized = list.map((review) => {
      const user = review.userId && typeof review.userId === 'object' ? review.userId : null;
      const fullName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : '';
      return {
        ...review,
        author: fullName || user?.email || 'Anonymous',
      };
    });
    await reviewCache.set(reviewCache.key.product(productId), normalized);
    return normalized;
  }

  async getAggregate(productId) {
    const cached = await reviewCache.get(reviewCache.key.aggregate(productId));
    if (cached) return cached;

    const [agg] = await repo.getAggregate(productId);
    const result = {
      averageRating: agg ? Number(agg.avgRating.toFixed(2)) : 0,
      reviewCount: agg ? agg.count : 0,
    };
    await reviewCache.set(reviewCache.key.aggregate(productId), result);
    return {
      averageRating: result.averageRating,
      reviewCount: result.reviewCount,
    };
  }

  async create({ user, payload }) {
    const existing = await repo.findByUserProduct(user.id, payload.productId);
    if (existing) error('You have already reviewed this product', 409);

    // 2. VERIFIED PURCHASE CHECK (DOCX REQUIREMENT)
    const purchasedItems = await OrderItem.find({
      productId: payload.productId,
    })
      .populate({
        path: 'orderId',
        match: { userId: user.id },
        select: '_id orderStatus',
      })
      .select('status orderId')
      .lean();

    const hasDeliveredPurchase = purchasedItems.some(
      (item) =>
        item.orderId &&
        (item.status === 'delivered' || item.orderId.orderStatus === ORDER_STATUS.DELIVERED),
    );

    if (!hasDeliveredPurchase) {
      error('Only verified buyers can review this product', 403);
    }
    const created = await repo.create({
      userId: user.id,
      productId: payload.productId,
      rating: payload.rating,
      title: payload.title,
      comment: payload.comment,
      status: 'published',
    });

    await this.syncProductRating(payload.productId);
    await reviewCache.clearProduct(payload.productId);

    return created;
  }

  async update({ user, reviewId, payload }) {
    const review = await repo.findById(reviewId);
    if (!review) error('Review not found', 404);

    // Only admin can change status
    if (payload.status && user.role !== ROLES.ADMIN) {
      error('Forbidden', 403);
    }

    // Only owner or admin can edit
    if (user.role !== ROLES.ADMIN && String(review.userId) !== String(user.id)) {
      error('Forbidden', 403);
    }

    const updated = await repo.update(reviewId, payload);

    await this.syncProductRating(review.productId);
    await reviewCache.clearProduct(review.productId);

    return updated;
  }

  async remove({ user, reviewId }) {
    const review = await repo.findById(reviewId);
    if (!review) error('Review not found', 404);

    if (user.role !== ROLES.ADMIN && String(review.userId) !== String(user.id)) {
      error('Forbidden', 403);
    }

    await repo.remove(reviewId);

    await this.syncProductRating(review.productId);
    await reviewCache.clearProduct(review.productId);

    return { deleted: true };
  }

  async syncProductRating(productId) {
    const [agg] = await repo.getAggregate(productId);

    const ratingAvg = agg ? Number(agg.avgRating.toFixed(2)) : 0;
    const ratingCount = agg ? agg.count : 0;

    await Product.findByIdAndUpdate(productId, {
      ratingAvg,
      ratingCount,
    });

    await reviewCache.del(reviewCache.key.aggregate(productId));
  }

  async adminList(query = {}) {
    const { status, productId, rating, limit = 20, page = 1 } = query;

    const filter = {};
    if (status) filter.status = status;
    if (productId) filter.productId = productId;
    if (rating) filter.rating = Number(rating);

    return repo.adminList(filter, {
      limit: Number(limit),
      page: Number(page),
    });
  }

  async adminGet(reviewId) {
    const review = await repo.findByIdWithRefs(reviewId);
    if (!review) error('Review not found', 404);
    return review;
  }
}

module.exports = new ReviewsService();
