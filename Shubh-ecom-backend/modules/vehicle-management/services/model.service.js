const vehicleModelsRepo = require('../repositories/model.repository');
const Brand = require('../../../models/Brand.model');
const VehicleModelYear = require('../models/VehicleModelYear.model');
const Vehicle = require('../models/Vehicle.model');
const { error } = require('../../../utils/apiResponse');

class VehicleModelsService {
  async list(query = {}) {
    const filter = {};
    if (query.brandId) filter.brandId = query.brandId;
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);

    const [items, total] = await Promise.all([
      vehicleModelsRepo.list(filter, { page, limit }),
      vehicleModelsRepo.count(filter),
    ]);

    return { items, total, page, limit };
  }

  async create(payload) {
    if (!payload.brandId) error('brandId is required', 400);
    if (!payload.name) error('name is required', 400);

    const brand = await Brand.findById(payload.brandId).lean();
    if (!brand || brand.type !== 'vehicle') {
      error('Vehicle brand not found', 404);
    }

    // Check for existing model (including deleted)
    const existing = await vehicleModelsRepo.findByNameAndBrandIncludingDeleted(payload.brandId, payload.name);

    if (existing) {
      if (existing.isDeleted) {
        // Restore if soft-deleted
        return vehicleModelsRepo.restore(existing._id, { 
          isDeleted: false, 
          status: payload.status || 'active' 
        });
      } else {
        error('Vehicle model already exists', 409);
      }
    }

    return vehicleModelsRepo.create(payload);
  }

  async get(id) {
    const model = await vehicleModelsRepo.findById(id);
    if (!model) error('Vehicle model not found', 404);
    return model;
  }

  async update(id, payload) {
    if (payload.brandId) {
      const brand = await Brand.findById(payload.brandId).lean();
      if (!brand || brand.type !== 'vehicle') {
        error('Vehicle brand not found', 404);
      }
    }

    const model = await vehicleModelsRepo.update(id, payload);
    if (!model) error('Vehicle model not found', 404);
    return model;
  }

  async remove(id) {
    // Cascading soft delete for associated model years
    const linkedYears = await VehicleModelYear.find({ modelId: id });
    if (linkedYears.length > 0) {
      await VehicleModelYear.updateMany(
        { modelId: id },
        { $set: { isDeleted: true } }
      );
    }

    // Cascading soft delete for associated vehicles
    const linkedVehicles = await Vehicle.find({ modelId: id });
    if (linkedVehicles.length > 0) {
      await Vehicle.updateMany(
        { modelId: id },
        { $set: { isDeleted: true } }
      );
    }

    const model = await vehicleModelsRepo.softDelete(id);
    if (!model) error('Vehicle model not found', 404);
    return model;
  }
}

module.exports = new VehicleModelsService();
