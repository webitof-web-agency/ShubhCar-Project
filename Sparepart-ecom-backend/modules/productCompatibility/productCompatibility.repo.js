const ProductCompatibility = require('../../models/ProductCompatibility.model');

class ProductCompatibilityRepo {
  findByProduct(productId) {
    return ProductCompatibility.findOne({ productId }).lean();
  }

  upsert(productId, vehicleIds) {
    return ProductCompatibility.findOneAndUpdate(
      { productId },
      { $set: { productId, vehicleIds }, $unset: { fits: 1 } },
      { new: true, upsert: true },
    );
  }
}

module.exports = new ProductCompatibilityRepo();
