const Seo = require('../../models/Seo.model');

class SeoRepository {
  async upsert(filter, data) {
    return Seo.findOneAndUpdate(filter, data, {
      upsert: true,
      new: true,
      runValidators: true,
    }).lean();
  }

  findOne(filter) {
    return Seo.findOne(filter).lean();
  }

  list(filter = {}) {
    return Seo.find(filter).sort({ updatedAt: -1 }).lean();
  }

  async deactivate(id) {
    return Seo.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
  }
}

module.exports = new SeoRepository();
