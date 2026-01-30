const UserAddress = require('../../models/UserAddress.model');

class UserAddressRepository {
  findById(id) {
    return UserAddress.findById(id).lean();
  }
}

module.exports = new UserAddressRepository();
