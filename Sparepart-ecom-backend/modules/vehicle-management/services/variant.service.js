const repo = require('../repositories/variant.repository');
const { error } = require('../../../utils/apiResponse');

class VehicleVariantsService {
  async list(query = {}) {
    const filter = {};
    if (query.modelYearId) filter.modelYearId = query.modelYearId;
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);

    const [items, total] = await Promise.all([
      repo.list(filter, { page, limit }),
      repo.count(filter),
    ]);

    return { items, total, page, limit };
  }

  create(payload) {
    if (!payload.modelYearId) error('modelYearId is required', 400);
    if (!payload.name) error('name is required', 400);
    return repo.create(payload);
  }

  async get(id) {
    const item = await repo.findById(id);
    if (!item) error('Vehicle variant not found', 404);
    return item;
  }

  async update(id, payload) {
    const item = await repo.update(id, payload);
    if (!item) error('Vehicle variant not found', 404);
    return item;
  }

  async remove(id) {
    const item = await repo.softDelete(id);
    if (!item) error('Vehicle variant not found', 404);
    return item;
  }
}

module.exports = new VehicleVariantsService();
