const categoryRepo = require('../categories/category.repo');
const categoryAttrRepo = require('./categoryAttribute.repo');
const { error } = require('../../utils/apiResponse');

class CategoryAttributeService {
  async listByCategory(categoryId) {
    const ancestryIds = await categoryRepo.getAncestryIds(categoryId);
    if (!ancestryIds.length) error('Category not found', 404);

    const depthMap = new Map();
    ancestryIds.forEach((id, index) => depthMap.set(String(id), index));

    const attributes = await categoryAttrRepo.findByCategoryIds(ancestryIds);

    return attributes
      .map((attr) => {
        const depth = depthMap.get(String(attr.categoryId)) || 0;
        return {
          ...attr,
          isInherited: String(attr.categoryId) !== String(categoryId),
          inheritedFrom: attr.categoryId,
          depth,
        };
      })
      .sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        return a.name.localeCompare(b.name);
      })
      .map(({ depth, ...rest }) => rest);
  }

  async create(payload) {
    const category = await categoryRepo.findById(payload.categoryId);
    if (!category) error('Category not found', 404);

    return categoryAttrRepo.create(payload);
  }

  async update(attributeId, payload) {
    const attribute = await categoryAttrRepo.findById(attributeId);
    if (!attribute) error('Attribute not found', 404);

    if (
      payload.specType &&
      payload.specType !== attribute.specType
    ) {
      const usageCount = await categoryAttrRepo.countUsage(attributeId);
      if (usageCount > 0) {
        error('specType cannot be changed once products use this attribute', 400);
      }
    }

    const targetSpecType = payload.specType || attribute.specType;
    const safePayload = { ...payload };

    if (['text', 'number'].includes(targetSpecType)) {
      if (payload.options && payload.options.length) {
        error('Options allowed only for select/multiselect attributes', 400);
      }
      safePayload.options = [];
    }

    return categoryAttrRepo.updateById(attributeId, safePayload);
  }

  async remove(attributeId) {
    const attribute = await categoryAttrRepo.findById(attributeId);
    if (!attribute) error('Attribute not found', 404);

    const usageCount = await categoryAttrRepo.countUsage(attributeId);
    if (usageCount > 0) {
      error('Cannot delete attribute that is used by products', 400);
    }

    return categoryAttrRepo.deleteById(attributeId);
  }
}

module.exports = new CategoryAttributeService();
