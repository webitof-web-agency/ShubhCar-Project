const VehicleYear = require('../models/VehicleYear.model');

class VehicleYearsRepo {
  list(filter, { page = 1, limit = 50 } = {}) {
    return VehicleYear.find(filter)
      .sort({ year: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  count(filter) {
    return VehicleYear.countDocuments(filter);
  }

  create(data) {
    return VehicleYear.create(data);
  }

  findById(id) {
    return VehicleYear.findById(id).lean();
  }

  findByYear(year) {
    return VehicleYear.findOne({ year }).lean();
  }

  update(id, data) {
    return VehicleYear.findByIdAndUpdate(id, data, { new: true });
  }

  softDelete(id) {
    return VehicleYear.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
  }
}

module.exports = new VehicleYearsRepo();
