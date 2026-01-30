const ProductAttributeValue = require('../../models/ProductAttributeValue.model');

class ProductAttributeValuesRepo {
  create(data) {
    return ProductAttributeValue.create(data);
  }

  findById(id) {
    return ProductAttributeValue.findById(id).lean();
  }

  list(filter = {}) {
    return ProductAttributeValue.find(filter).sort({ createdAt: -1 }).lean();
  }

  update(id, data) {
    return ProductAttributeValue.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  remove(id) {
    return ProductAttributeValue.findByIdAndDelete(id).lean();
  }
}

module.exports = new ProductAttributeValuesRepo();
