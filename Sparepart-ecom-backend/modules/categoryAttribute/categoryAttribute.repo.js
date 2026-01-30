const CategoryAttribute = require('../../models/CategoryAttribute.model');
const ProductAttributeValue = require('../../models/ProductAttributeValue.model');

class CategoryAttributeRepository {
  create(data) {
    return CategoryAttribute.create(data);
  }

  findById(id) {
    return CategoryAttribute.findById(id).lean();
  }

  findByCategoryIds(categoryIds) {
    return CategoryAttribute.find({ categoryId: { $in: categoryIds } })
      .sort({ createdAt: 1 })
      .lean();
  }

  findRequiredByCategoryIds(categoryIds) {
    return CategoryAttribute.find({
      categoryId: { $in: categoryIds },
      isRequired: true,
    }).lean();
  }

  updateById(id, data) {
    return CategoryAttribute.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  deleteById(id) {
    return CategoryAttribute.findByIdAndDelete(id).lean();
  }

  countUsage(attributeId) {
    return ProductAttributeValue.countDocuments({ attributeId });
  }
}

module.exports = new CategoryAttributeRepository();
