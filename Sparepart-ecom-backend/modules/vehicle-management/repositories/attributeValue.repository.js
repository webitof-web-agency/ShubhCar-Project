const VehicleAttributeValue = require('../models/VehicleAttributeValue.model');

class VehicleAttributeValuesRepo {
  list(filter, { page = 1, limit = 50 } = {}) {
    return VehicleAttributeValue.find(filter)
      .sort({ value: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  listByAttributes(attributeIds) {
    return VehicleAttributeValue.find({ attributeId: { $in: attributeIds } })
      .sort({ value: 1 })
      .lean();
  }

  count(filter) {
    return VehicleAttributeValue.countDocuments(filter);
  }

  create(data) {
    return VehicleAttributeValue.create(data);
  }

  findById(id) {
    return VehicleAttributeValue.findById(id).lean();
  }

  findByValue(attributeId, value) {
    return VehicleAttributeValue.findOne({ attributeId, value }).lean();
  }

  update(id, data) {
    return VehicleAttributeValue.findByIdAndUpdate(id, data, { new: true });
  }

  softDelete(id) {
    return VehicleAttributeValue.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
  }
}

module.exports = new VehicleAttributeValuesRepo();
