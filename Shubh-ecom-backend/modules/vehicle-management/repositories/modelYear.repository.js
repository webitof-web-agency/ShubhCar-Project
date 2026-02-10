const mongoose = require('mongoose');
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

  // Bypass pre-find hook to find deleted/non-deleted items
  findByModelAndYearIncludingDeleted(modelId, year) {
    return VehicleModelYear.collection.findOne({
      modelId: new mongoose.Types.ObjectId(modelId),
      year: year
    });
  }

  update(id, data) {
    return VehicleModelYear.findByIdAndUpdate(id, data, { new: true });
  }

  // Bypass pre-find hook to update deleted items
  async restore(id, data) {
    const res = await VehicleModelYear.collection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: data },
      { returnDocument: 'after' }
    );
    if (!res) return null;
    return res.value || res;
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
