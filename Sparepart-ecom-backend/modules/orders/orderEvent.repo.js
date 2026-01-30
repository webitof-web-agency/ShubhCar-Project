const OrderEvent = require('../../models/OrderEvent.model');

class OrderEventRepo {
  async log(
    { orderId, type, previousStatus, newStatus, actor, meta, noteType, noteContent },
    session,
  ) {
    const [doc] = await OrderEvent.create(
      [
        {
          orderId,
          type,
          previousStatus,
          newStatus,
          actor,
          meta,
          noteType,
          noteContent,
        },
      ],
      { session },
    );

    return doc;
  }

  async listByOrder(orderId, session) {
    const query = OrderEvent.find({ orderId }).sort({ createdAt: 1 });
    if (session) query.session(session);
    return query.lean();
  }

  async findByOrder(orderId, session) {
    return this.listByOrder(orderId, session);
  }
}

module.exports = new OrderEventRepo();
