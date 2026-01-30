const ProductAttributeValue = require('../../models/ProductAttributeValue.model');

class ProductAttributeRepository {
  getByProduct(productId) {
    return ProductAttributeValue.find({ productId })
      .populate('attributeId')
      .lean();
  }

  getByProductAndAttr(productId, attributeId) {
    return ProductAttributeValue.findOne({ productId, attributeId }).lean();
  }

  upsert(productId, attributeId, valuePayload) {
    return ProductAttributeValue.findOneAndUpdate(
      { productId, attributeId },
      { productId, attributeId, ...valuePayload },
      { upsert: true, new: true },
    ).lean();
  }

  remove(productId, attributeId) {
    return ProductAttributeValue.findOneAndDelete({ productId, attributeId });
  }

  removeAllByProduct(productId) {
    return ProductAttributeValue.deleteMany({ productId });
  }
}

module.exports = new ProductAttributeRepository();
