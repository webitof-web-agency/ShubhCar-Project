const ProductReview = require('../../models/ProductReview.model');

class ReviewsRepo {
  findByProduct(productId) {
    return ProductReview.find(
      { productId, status: 'published' },
      { userId: 1, rating: 1, title: 1, comment: 1, createdAt: 1 },
    )
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();
  }

  getAggregate(productId) {
    const mongoose = require('mongoose');
    return ProductReview.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          status: 'published',
        },
      },
      {
        $group: {
          _id: '$productId',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);
  }

  findById(id) {
    return ProductReview.findById(id).lean();
  }

  findByIdWithRefs(id) {
    return ProductReview.findById(id)
      .populate('userId', 'firstName lastName email phone')
      .populate('productId', 'name sku slug ratingAvg ratingCount')
      .lean();
  }

  findByUserProduct(userId, productId) {
    return ProductReview.findOne({ userId, productId }).lean();
  }

  create(data) {
    return ProductReview.create(data);
  }

  update(id, payload) {
    return ProductReview.findByIdAndUpdate(id, payload, { new: true }).lean();
  }

  remove(id) {
    return ProductReview.findByIdAndDelete(id).lean();
  }

  adminList(filter = {}, { limit = 20, page = 1 } = {}) {
    const safeLimit = Math.min(Number(limit) || 20, 100);
    const safePage = Math.max(Number(page) || 1, 1);

    return ProductReview.find(filter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit)
      .populate('userId', 'firstName lastName email phone')
      .populate('productId', 'name sku slug ratingAvg ratingCount')
      .lean();
  }

  adminCount(filter = {}) {
    return ProductReview.countDocuments(filter);
  }
}

module.exports = new ReviewsRepo();
