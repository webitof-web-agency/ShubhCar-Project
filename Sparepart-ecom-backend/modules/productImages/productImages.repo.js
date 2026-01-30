const ProductImage = require('../../models/ProductImage.model');

class ProductImagesRepo {
  create(data) {
    return ProductImage.create(data);
  }

  findById(id) {
    return ProductImage.findById(id).lean();
  }

  list(filter = {}) {
    return ProductImage.find(filter).sort({ createdAt: -1 }).lean();
  }

  update(id, data) {
    return ProductImage.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async remove(id) {
    const found = await ProductImage.findById(id);
    if (!found) return null;
    return ProductImage.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), isPrimary: false },
      { new: true },
    ).lean();
  }
}

module.exports = new ProductImagesRepo();
