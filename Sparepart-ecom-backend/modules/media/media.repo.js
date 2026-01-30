const Media = require('../../models/Media.model');

class MediaRepository {
  async create(data) {
    const doc = await Media.create(data);
    return doc.toObject();
  }

  async createMany(items = []) {
    if (!items.length) return [];
    const docs = await Media.insertMany(items);
    return docs.map((doc) => doc.toObject());
  }

  findById(id) {
    return Media.findOne({ _id: id, isDeleted: false }).lean();
  }

  list(filter = {}, { limit = 20, page = 1 } = {}) {
    const safeLimit = Math.min(Number(limit) || 20, 100);
    const safePage = Math.max(Number(page) || 1, 1);

    return Media.find({ ...filter, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit)
      .lean();
  }

  count(filter = {}) {
    return Media.countDocuments({ ...filter, isDeleted: false });
  }

  async softDelete(id) {
    return Media.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    ).lean();
  }
}

module.exports = new MediaRepository();
