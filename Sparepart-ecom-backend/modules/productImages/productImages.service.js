const repo = require('./productImages.repo');
const { error } = require('../../utils/apiResponse');

class ProductImagesService {
  list(filter = {}) {
    return repo.list(filter);
  }

  async get(id) {
    const item = await repo.findById(id);
    if (!item) error('Product image not found', 404);
    return item;
  }

  create(payload) {
    return repo.create(payload);
  }

  async update(id, payload) {
    const updated = await repo.update(id, payload);
    if (!updated) error('Product image not found', 404);
    return updated;
  }

  async remove(id) {
    const deleted = await repo.remove(id);
    if (!deleted) error('Product image not found', 404);
    return deleted;
  }
}

module.exports = new ProductImagesService();
