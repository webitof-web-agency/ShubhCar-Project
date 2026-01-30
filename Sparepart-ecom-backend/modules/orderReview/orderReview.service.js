const ManualReview = require('../../models/ManualReview.model');
const orderService = require('../orders/orders.service');
const { error } = require('../../utils/apiResponse');

class ManualReviewService {
  async resolve({ reviewId, admin, action, note }) {
    const review = await ManualReview.findById(reviewId);
    if (!review || review.status !== 'pending') {
      error('Review not found or already resolved', 404);
    }

    if (action === 'approve') {
      await orderService.confirmOrder(review.orderId);
      review.status = 'resolved';
    }

    if (action === 'reject') {
      await orderService.failOrder(review.orderId);
      review.status = 'rejected';
    }

    review.resolutionNote = note;
    review.resolvedBy = admin.id;
    review.resolvedAt = new Date();

    await review.save();
    return review;
  }
}

module.exports = new ManualReviewService();
