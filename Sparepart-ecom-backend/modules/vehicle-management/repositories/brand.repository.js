const Brand = require('../../../models/Brand.model');

class VehicleBrandsRepo {
  list(filter, { page = 1, limit = 50 } = {}) {
    return Brand.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  count(filter) {
    return Brand.countDocuments(filter);
  }

  create(data) {
    return Brand.create(data);
  }

  findById(id) {
    return Brand.findById(id).lean();
  }

  findByName(name) {
    return Brand.findOne({ name }).lean();
  }

  update(id, data) {
    return Brand.findByIdAndUpdate(id, data, { new: true });
  }

  softDelete(id) {
    return Brand.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  }
}

module.exports = new VehicleBrandsRepo();
