const ShippingRule = require('../../models/ShippingRule.model');

class ShippingRulesRepo {
  list(filter = {}) {
    return ShippingRule.find(filter).sort({ createdAt: -1 }).lean();
  }

  create(data) {
    return ShippingRule.create(data);
  }

  update(id, data) {
    return ShippingRule.findByIdAndUpdate(id, data, { new: true });
  }

  remove(id) {
    return ShippingRule.findByIdAndDelete(id);
  }
}

module.exports = new ShippingRulesRepo();
