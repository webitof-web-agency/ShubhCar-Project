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

  // Bypass pre-find hook to find deleted/non-deleted items
  findByNameAndBrandIncludingDeleted(brandId, name) {
    const mongoose = require('mongoose');
    return VehicleModel.collection.findOne({
      brandId: new mongoose.Types.ObjectId(brandId),
      name: name
    });
  }

  // Bypass pre-find hook to update deleted items
  async restore(id, data) {
    const mongoose = require('mongoose');
    const res = await VehicleModel.collection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: data },
      { returnDocument: 'after' }
    );
    if (!res) return null;
    return res.value || res;
  }
}

module.exports = new VehicleModelsRepo();
