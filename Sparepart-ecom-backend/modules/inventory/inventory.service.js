const Product = require('../../models/Product.model');
const { error } = require('../../utils/apiResponse');
const { enqueueEmail } = require('../../queues/email.queue');
const env = require('../../config/env');
const inventoryCache = require('../../cache/inventory.cache');
const logger = require('../../config/logger');

const LOW_STOCK_THRESHOLD = Number(env.LOW_STOCK_THRESHOLD || 5);
const STOCK_ALERT_EMAIL = env.STOCK_ALERT_EMAIL; // admin email

class InventoryService {
  /**
   * Reserve stock when order is created
   * Decrements stockQty for simple products.
   */
  async reserve(productId, qty, session, context = {}) {
    if (qty <= 0) error('Invalid quantity', 400);

    const res = await Product.updateOne(
      {
        _id: productId,
        isDeleted: false,
        status: 'active',
        $expr: {
          $gte: ['$stockQty', qty],
        },
      },
      { $inc: { stockQty: -qty } },
      { session },
    );

    if (res.modifiedCount === 0) {
      error('Insufficient stock', 409);
    }

    await inventoryCache.del(productId);

    logger.info('inventory_adjustment', {
      type: 'inventory_adjustment',
      action: 'reserve',
      productId: String(productId),
      quantity: qty,
      entityId: context.orderId || String(productId),
      requestId: context.requestId || null,
      route: context.route,
      method: context.method,
      userId: context.userId || null,
    });
  }

  /**
   * Commit stock after payment success
   * No-op stock mutation for simple products (already decremented on reserve).
   * Triggers low-stock email alert if needed.
   */
  async commit(productId, qty, session, context = {}) {
    if (qty <= 0) error('Invalid quantity', 400);

    const updated = await Product.findOne({
      _id: productId,
      status: 'active',
      isDeleted: false,
    })
      .session(session)
      .lean();

    if (!updated) {
      error('Inventory commit failed', 409);
    }

    await inventoryCache.del(productId);

    logger.info('inventory_adjustment', {
      type: 'inventory_adjustment',
      action: 'commit',
      productId: String(productId),
      quantity: qty,
      entityId: context.orderId || String(productId),
      requestId: context.requestId || null,
      route: context.route,
      method: context.method,
      userId: context.userId || null,
    });

    // dY"" LOW STOCK EMAIL ALERT (ASYNC, NON-BLOCKING)
    if (STOCK_ALERT_EMAIL && updated.stockQty <= LOW_STOCK_THRESHOLD) {
      enqueueEmail({
        templateName: 'inventory_low_stock',
        to: STOCK_ALERT_EMAIL,
        variables: {
          sku: updated.sku,
          productId: updated._id.toString(),
          stockQty: String(updated.stockQty),
          threshold: String(LOW_STOCK_THRESHOLD),
        },
      });
    }

    return updated;
  }

  /**
   * Release stock on cancel / failure
   * Restores stockQty for simple products.
   */
  async release(productId, qty, session, context = {}) {
    if (qty <= 0) error('Invalid quantity', 400);

    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        isDeleted: false,
      },
      { $inc: { stockQty: qty } },
      { new: true, session },
    );

    if (!updated) {
      error('Inventory release failed', 409);
    }

    await inventoryCache.del(productId);
    logger.info('inventory_adjustment', {
      type: 'inventory_adjustment',
      action: 'release',
      productId: String(productId),
      quantity: qty,
      entityId: context.orderId || String(productId),
      requestId: context.requestId || null,
      route: context.route,
      method: context.method,
      userId: context.userId || null,
    });
    return updated;
  }
}

module.exports = new InventoryService();
