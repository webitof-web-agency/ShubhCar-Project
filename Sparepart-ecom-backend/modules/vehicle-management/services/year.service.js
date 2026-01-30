const repo = require('../repositories/year.repository');
const Vehicle = require('../models/Vehicle.model');
const { error } = require('../../../utils/apiResponse');

const MIN_YEAR = 1886;

const validateYear = (year) => {
  if (!Number.isInteger(year)) {
    error('year must be an integer', 400);
  }
  const maxYear = new Date().getFullYear() + 1;
  if (year < MIN_YEAR || year > maxYear) {
    error(`year must be between ${MIN_YEAR} and ${maxYear}`, 400);
  }
};

class VehicleYearsService {
  async list(query = {}) {
    const filter = { isDeleted: false };
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.year = Number(query.search);
    }

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);

    const [items, total] = await Promise.all([
      repo.list(filter, { page, limit }),
      repo.count(filter),
    ]);

    return { items, total, page, limit };
  }

  async create(payload) {
    const year = Number(payload.year);
    if (!payload.year) error('year is required', 400);
    validateYear(year);

    const existing = await repo.findByYear(year);
    if (existing) error('year already exists', 409);

    return repo.create({ year, status: payload.status || 'active' });
  }

  async get(id) {
    const item = await repo.findById(id);
    if (!item) error('Vehicle year not found', 404);
    return item;
  }

  async update(id, payload) {
    if (payload.year !== undefined) {
      const year = Number(payload.year);
      validateYear(year);
      const existing = await repo.findByYear(year);
      if (existing && String(existing._id) !== String(id)) {
        error('year already exists', 409);
      }
      payload.year = year;
    }

    const item = await repo.update(id, payload);
    if (!item) error('Vehicle year not found', 404);
    return item;
  }

  async remove(id) {
    const linkedVehicle = await Vehicle.findOne({ yearId: id }).lean();
    if (linkedVehicle) {
      error('Cannot delete year linked to vehicles', 400);
    }

    const item = await repo.softDelete(id);
    if (!item) error('Vehicle year not found', 404);
    return item;
  }
}

module.exports = new VehicleYearsService();
