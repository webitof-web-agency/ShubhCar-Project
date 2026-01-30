const VehicleModel = require('../models/VehicleModel.model');

class VehicleModelsRepo {
  list(filter, { page = 1, limit = 50 } = {}) {
    const query = VehicleModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return query.lean();
  }

  count(filter) {
    return VehicleModel.countDocuments(filter);
  }

  create(data) {
    return VehicleModel.create(data);
  }

  findById(id) {
    return VehicleModel.findById(id).lean();
  }

  update(id, data) {
    return VehicleModel.findByIdAndUpdate(id, data, { new: true });
  }

  softDelete(id) {
    return VehicleModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
  }
}

module.exports = new VehicleModelsRepo();
