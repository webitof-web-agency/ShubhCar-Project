const repo = require('../repositories/modelYear.repository');
const { error } = require('../../../utils/apiResponse');

class VehicleModelYearsService {
  async list(query = {}) {
    const filter = {};
    if (query.modelId) filter.modelId = query.modelId;
    if (query.status) filter.status = query.status;
    if (query.year) filter.year = Number(query.year);

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);

    const [items, total] = await Promise.all([
      repo.list(filter, { page, limit }),
      repo.count(filter),
    ]);

    return { items, total, page, limit };
  }

  create(payload) {
    if (!payload.modelId) error('modelId is required', 400);
    if (!payload.year) error('year is required', 400);
    return repo.create(payload);
  }

  async get(id) {
    const item = await repo.findById(id);
    if (!item) error('Vehicle model year not found', 404);
    return item;
  }

  async update(id, payload) {
    const item = await repo.update(id, payload);
    if (!item) error('Vehicle model year not found', 404);
    return item;
  }

  async remove(id) {
    const item = await repo.softDelete(id);
    if (!item) error('Vehicle model year not found', 404);
    return item;
  }
}

module.exports = new VehicleModelYearsService();
