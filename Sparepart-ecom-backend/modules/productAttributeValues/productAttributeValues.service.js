const repo = require('./productAttributeValues.repo');
const { error } = require('../../utils/apiResponse');

class ProductAttributeValuesService {
  list(filter = {}) {
    return repo.list(filter);
  }

  async get(id) {
    const item = await repo.findById(id);
    if (!item) error('Product attribute value not found', 404);
    return item;
  }

  async create(payload) {
    return repo.create(payload);
  }

  async update(id, payload) {
    const updated = await repo.update(id, payload);
    if (!updated) error('Product attribute value not found', 404);
    return updated;
  }

  async remove(id) {
    const deleted = await repo.remove(id);
    if (!deleted) error('Product attribute value not found', 404);
    return deleted;
  }
}

module.exports = new ProductAttributeValuesService();
