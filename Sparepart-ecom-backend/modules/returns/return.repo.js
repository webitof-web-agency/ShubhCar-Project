const ReturnRequest = require('../../models/ReturnRequest.model');

class ReturnRepo {
  create(data, session) {
    return ReturnRequest.create([data], { session }).then((r) => r[0]);
  }

  findById(id, session) {
    const query = ReturnRequest.findById(id);
    if (session) query.session(session);
    return query.lean();
  }

  list(filter = {}, session) {
    const query = ReturnRequest.find(filter).sort({ createdAt: -1 });
    if (session) query.session(session);
    return query.lean();
  }

  update(id, update, options = {}) {
    const queryOpts = { new: true, ...options };
    return ReturnRequest.findByIdAndUpdate(id, update, queryOpts).lean();
  }
}

module.exports = new ReturnRepo();
