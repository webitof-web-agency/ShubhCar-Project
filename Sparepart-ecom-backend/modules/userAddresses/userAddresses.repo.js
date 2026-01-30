const UserAddress = require('../../models/UserAddress.model');

class UserAddressesRepo {
  create(data) {
    return UserAddress.create(data);
  }

  listByUser(userId) {
    return UserAddress.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  findById(id) {
    return UserAddress.findById(id).lean();
  }

  update(id, data) {
    return UserAddress.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  remove(id) {
    return UserAddress.findByIdAndDelete(id).lean();
  }
}

module.exports = new UserAddressesRepo();
