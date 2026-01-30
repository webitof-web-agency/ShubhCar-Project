const EmailTemplate = require('../../models/EmailTemplate.model');

class EmailTemplatesRepo {
  create(data) {
    return EmailTemplate.create(data);
  }

  list(filter = {}) {
    return EmailTemplate.find(filter).sort({ updatedAt: -1 }).lean();
  }

  findById(id) {
    return EmailTemplate.findById(id).lean();
  }

  update(id, data) {
    return EmailTemplate.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  remove(id) {
    return EmailTemplate.findByIdAndDelete(id).lean();
  }
}

module.exports = new EmailTemplatesRepo();
