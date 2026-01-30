const repo = require('../repositories/attribute.repository');
const VehicleAttributeValue = require('../models/VehicleAttributeValue.model');
const Vehicle = require('../models/Vehicle.model');
const { error } = require('../../../utils/apiResponse');

const VALID_TYPES = ['dropdown', 'text'];
const VARIANT_NAME_KEY = 'variant name';
const isVariantName = (name) =>
  String(name || '').trim().toLowerCase() === VARIANT_NAME_KEY;

class VehicleAttributesService {
  async list(query = {}) {
    const filter = { isDeleted: false };
    const nameExclusion = { $not: /^variant name$/i };
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$and = [
        { name: nameExclusion },
        { name: { $regex: query.search, $options: 'i' } },
      ];
    } else {
      filter.name = nameExclusion;
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
    if (isVariantName(payload.name)) {
      error('Variant Name is managed on vehicles and cannot be created as an attribute', 400);
    }
    if (payload.type && !VALID_TYPES.includes(payload.type)) {
      error('type must be dropdown or text', 400);
    }

    const existing = await repo.findByName(payload.name.trim());
    if (existing) error('attribute already exists', 409);

    return repo.create({
      name: payload.name.trim(),
      type: payload.type || 'dropdown',
      status: payload.status || 'active',
    });
  }

  async get(id) {
    const item = await repo.findById(id);
    if (!item) error('Vehicle attribute not found', 404);
    return item;
  }

  async update(id, payload) {
    if (payload.type && !VALID_TYPES.includes(payload.type)) {
      error('type must be dropdown or text', 400);
    }
    if (payload.name) {
      if (isVariantName(payload.name)) {
        error('Variant Name is managed on vehicles and cannot be used as an attribute', 400);
      }
      const existing = await repo.findByName(payload.name.trim());
      if (existing && String(existing._id) !== String(id)) {
        error('attribute already exists', 409);
      }
      payload.name = payload.name.trim();
    }

    const item = await repo.update(id, payload);
    if (!item) error('Vehicle attribute not found', 404);
    return item;
  }

  async remove(id) {
    const value = await VehicleAttributeValue.findOne({ attributeId: id }).lean();
    if (value) {
      error('Cannot delete attribute with values', 400);
    }

    const linkedVehicle = await Vehicle.findOne({
      attributeValueIds: { $exists: true, $ne: [] },
    })
      .populate({
        path: 'attributeValueIds',
        match: { attributeId: id },
        select: '_id',
      })
      .lean();

    if (linkedVehicle?.attributeValueIds?.length) {
      error('Cannot delete attribute linked to vehicles', 400);
    }

    const item = await repo.softDelete(id);
    if (!item) error('Vehicle attribute not found', 404);
    return item;
  }
}

module.exports = new VehicleAttributesService();
