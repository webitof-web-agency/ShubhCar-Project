const Role = require('../../models/Role.model');

class RolesRepo {
  list() {
    return Role.find({}).sort({ createdAt: -1 }).lean();
  }

  findById(id) {
    return Role.findById(id).lean();
  }

  findBySlug(slug) {
    return Role.findOne({ slug }).lean();
  }

  findByName(name) {
    return Role.findOne({ name }).lean();
  }

  create(data) {
    return Role.create(data);
  }

  updateById(id, data) {
    return Role.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  deleteById(id) {
    return Role.findByIdAndDelete(id).lean();
  }
}

module.exports = new RolesRepo();
