const Wishlist = require('../../models/Wishlist.model');

class WishlistRepo {
  findByUser(userId) {
    return Wishlist.find({ userId }).lean();
  }

  findOne(userId, productId) {
    return Wishlist.findOne({ userId, productId }).lean();
  }

  add(userId, productId) {
    return Wishlist.create({ userId, productId });
  }

  remove(userId, productId) {
    return Wishlist.findOneAndDelete({ userId, productId }).lean();
  }
}

module.exports = new WishlistRepo();
