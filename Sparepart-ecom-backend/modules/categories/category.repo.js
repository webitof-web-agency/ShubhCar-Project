const Category = require('../../models/Category.model');

class CategoryRepository {
  create(data) {
    return Category.create(data);
  }

  findBySlug(slug) {
    return Category.findOne({ slug, isActive: true }).lean();
  }
  findAnyBySlug(slug) {
    return Category.findOne({ slug }).lean();
  }

  findById(id) {
    return Category.findById(id).lean();
  }

  findRootCategories() {
    return Category.find({
      parentId: null,
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();
  }

  findChildren(parentId) {
    return Category.find({
      parentId,
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();
  }

  updateById(id, data) {
    return Category.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  softDelete(id) {
    return Category.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    ).lean();
  }

  findAll() {
    return Category.find({})
      .sort({ name: 1 })
      .lean();
  }

  bulkWrite(ops) {
    return Category.bulkWrite(ops, { ordered: false });
  }

  async getAncestryIds(categoryId) {
    const chain = [];
    let current = await Category.findById(categoryId).lean();

    while (current) {
      chain.push(current._id);
      if (!current.parentId) break;
      current = await Category.findById(current.parentId).lean();
    }

    return chain.reverse(); // root -> leaf
  }
}

module.exports = new CategoryRepository();
