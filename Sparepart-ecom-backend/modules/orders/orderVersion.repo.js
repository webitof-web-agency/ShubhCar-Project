const OrderVersion = require('../../models/OrderVersion.model');

class OrderVersionRepo {
  async getLatestVersion(orderId, session) {
    const query = OrderVersion.findOne({ orderId }).sort({ version: -1 });
    if (session) query.session(session);

    const last = await query.lean();
    return last ? last.version : 0;
  }

  async createVersion({ orderId, snapshot, reason, actor, session }) {
    const latest = await this.getLatestVersion(orderId, session);

    const [doc] = await OrderVersion.create(
      [
        {
          orderId,
          version: latest + 1,
          snapshot,
          reason,
          actor,
        },
      ],
      { session },
    );

    return doc;
  }

  async listByOrder(orderId, session) {
    const query = OrderVersion.find({ orderId }).sort({ version: 1 });
    if (session) query.session(session);
    return query.lean();
  }
}

module.exports = new OrderVersionRepo();
