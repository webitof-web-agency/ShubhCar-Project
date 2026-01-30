const VehicleAttribute = require('../models/VehicleAttribute.model');

class VehicleAttributesRepo {
  list(filter, { page = 1, limit = 50 } = {}) {
    return VehicleAttribute.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  count(filter) {
    return VehicleAttribute.countDocuments(filter);
  }

  create(data) {
    return VehicleAttribute.create(data);
  }

  findById(id) {
    return VehicleAttribute.findById(id).lean();
  }

  findByName(name) {
    return VehicleAttribute.findOne({ name }).lean();
  }

  update(id, data) {
    return VehicleAttribute.findByIdAndUpdate(id, data, { new: true });
  }

  softDelete(id) {
    return VehicleAttribute.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
  }
}

module.exports = new VehicleAttributesRepo();
