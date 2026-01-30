const slugify = require('slugify');
const repo = require('../repositories/brand.repository');
const VehicleModel = require('../models/VehicleModel.model');
const { error } = require('../../../utils/apiResponse');

class VehicleBrandsService {
  async list(query = {}) {
    const filter = { type: 'vehicle', isDeleted: false };
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

  async create(payload) {
    if (!payload.name) error('name is required', 400);
    if (!payload.logo) error('logo is required', 400);

    const name = payload.name.trim();
    const existing = await repo.findByName(name);
    if (existing) error('brand already exists', 409);

    const slug = payload.slug || slugify(name, { lower: true, strict: true });

    return repo.create({
      name,
      slug,
      description: payload.description || '',
      logo: payload.logo,
      type: 'vehicle',
      status: payload.status || 'active',
    });
  }

  async get(id) {
    const brand = await repo.findById(id);
    if (!brand || brand.type !== 'vehicle') error('Vehicle brand not found', 404);
    return brand;
  }

  async update(id, payload) {
    const brand = await repo.findById(id);
    if (!brand || brand.type !== 'vehicle') error('Vehicle brand not found', 404);

    if (payload.name) {
      const name = payload.name.trim();
      const existing = await repo.findByName(name);
      if (existing && String(existing._id) !== String(id)) {
        error('brand already exists', 409);
      }
      payload.name = name;
      if (!payload.slug) {
        payload.slug = slugify(name, { lower: true, strict: true });
      }
    }

    if (payload.logo === '') {
      error('logo is required', 400);
    }

    payload.type = 'vehicle';

    const updated = await repo.update(id, payload);
    if (!updated) error('Vehicle brand not found', 404);
    return updated;
  }

  async remove(id) {
    const brand = await repo.findById(id);
    if (!brand || brand.type !== 'vehicle') error('Vehicle brand not found', 404);

    const linkedModel = await VehicleModel.findOne({ brandId: id }).lean();
    if (linkedModel) {
      error('Cannot delete brand linked to vehicle models', 400);
    }

    const updated = await repo.softDelete(id);
    if (!updated) error('Vehicle brand not found', 404);
    return updated;
  }
}

module.exports = new VehicleBrandsService();
