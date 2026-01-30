const repo = require('../repositories/attributeValue.repository');
const VehicleAttribute = require('../models/VehicleAttribute.model');
const Vehicle = require('../models/Vehicle.model');
const { error } = require('../../../utils/apiResponse');

const VARIANT_NAME_KEY = 'variant name';
const isVariantName = (name) =>
  String(name || '').trim().toLowerCase() === VARIANT_NAME_KEY;

class VehicleAttributeValuesService {
  async list(query = {}) {
    const filter = { isDeleted: false };
    if (query.attributeId) filter.attributeId = query.attributeId;
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.value = { $regex: query.search, $options: 'i' };
    }

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);

    const [items, total] = await Promise.all([
      repo.list(filter, { page, limit }),
      repo.count(filter),
    ]);

    return { items, total, page, limit };
  }

  listByAttributes(attributeIds) {
    if (!attributeIds?.length) return [];
    return repo.listByAttributes(attributeIds);
  }

  async create(payload) {
    if (!payload.attributeId) error('attributeId is required', 400);
    if (!payload.value) error('value is required', 400);

    const attribute = await VehicleAttribute.findById(payload.attributeId).lean();
    if (!attribute) error('Vehicle attribute not found', 404);
    if (isVariantName(attribute.name)) {
      error('Variant Name is managed on vehicles and cannot have attribute values', 400);
    }

    const existing = await repo.findByValue(payload.attributeId, payload.value.trim());
    if (existing) error('attribute value already exists', 409);

    return repo.create({
      attributeId: payload.attributeId,
      value: payload.value.trim(),
      status: payload.status || 'active',
    });
  }

  async get(id) {
    const item = await repo.findById(id);
    if (!item) error('Vehicle attribute value not found', 404);
    return item;
  }

  async update(id, payload) {
    if (payload.attributeId) {
      const attribute = await VehicleAttribute.findById(payload.attributeId).lean();
      if (!attribute) error('Vehicle attribute not found', 404);
      if (isVariantName(attribute.name)) {
        error('Variant Name is managed on vehicles and cannot have attribute values', 400);
      }
    }

    if (payload.value) {
      const attributeId = payload.attributeId || (await repo.findById(id))?.attributeId;
      if (!attributeId) error('attributeId is required', 400);

      const attribute = await VehicleAttribute.findById(attributeId).lean();
      if (!attribute) error('Vehicle attribute not found', 404);
      if (isVariantName(attribute.name)) {
        error('Variant Name is managed on vehicles and cannot have attribute values', 400);
      }

      const existing = await repo.findByValue(attributeId, payload.value.trim());
      if (existing && String(existing._id) !== String(id)) {
        error('attribute value already exists', 409);
      }
      payload.value = payload.value.trim();
    }

    const item = await repo.update(id, payload);
    if (!item) error('Vehicle attribute value not found', 404);
    return item;
  }

  async remove(id) {
    const linkedVehicle = await Vehicle.findOne({ attributeValueIds: id }).lean();
    if (linkedVehicle) {
      error('Cannot delete value linked to vehicles', 400);
    }

    const item = await repo.softDelete(id);
    if (!item) error('Vehicle attribute value not found', 404);
    return item;
  }
}

module.exports = new VehicleAttributeValuesService();
