const VehicleVariant = require('../models/VehicleVariant.model');

class VehicleVariantsRepo {
  list(filter, { page = 1, limit = 50 } = {}) {
    return VehicleVariant.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  count(filter) {
    return VehicleVariant.countDocuments(filter);
  }

  create(data) {
    return VehicleVariant.create(data);
  }

  findById(id) {
    return VehicleVariant.findById(id).lean();
  }

  update(id, data) {
    return VehicleVariant.findByIdAndUpdate(id, data, { new: true });
  }

  softDelete(id) {
    return VehicleVariant.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
  }
}

module.exports = new VehicleVariantsRepo();
