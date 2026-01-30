const VehicleModelYear = require('../models/VehicleModelYear.model');

class VehicleModelYearsRepo {
  list(filter, { page = 1, limit = 50 } = {}) {
    return VehicleModelYear.find(filter)
      .sort({ year: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  count(filter) {
    return VehicleModelYear.countDocuments(filter);
  }

  create(data) {
    return VehicleModelYear.create(data);
  }

  findById(id) {
    return VehicleModelYear.findById(id).lean();
  }

  update(id, data) {
    return VehicleModelYear.findByIdAndUpdate(id, data, { new: true });
  }

  softDelete(id) {
    return VehicleModelYear.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
  }
}

module.exports = new VehicleModelYearsRepo();
