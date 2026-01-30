const Product = require('../../models/Product.model');
const InventoryLog = require('../../models/InventoryLog.model');
const { error } = require('../../utils/apiResponse');
const inventoryCache = require('../../cache/inventory.cache');

class InventoryAdminService {
  async summary({ threshold = 5 } = {}) {
    const thresholdValue = Number(threshold) || 5;

    const totalProducts = await Product.countDocuments({ isDeleted: false });

    const stockAgg = await Product.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$stockQty' },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ['$stockQty', thresholdValue] }, 1, 0] },
          },
          outOfStockCount: {
            $sum: { $cond: [{ $lte: ['$stockQty', 0] }, 1, 0] },
          },
        },
      },
    ]);

    const summary = stockAgg[0] || {
      totalStock: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    };

    return {
      totalProducts,
      totalStock: summary.totalStock,
      totalReserved: 0,
      lowStockCount: summary.lowStockCount,
      outOfStockCount: summary.outOfStockCount,
    };
  }

  async listProducts({ page = 1, limit = 20, search, status, threshold } = {}) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const thresholdValue = threshold != null ? Number(threshold) : null;

    const match = { isDeleted: false };
    if (status) match.status = status;
    if (thresholdValue != null) {
      match.stockQty = { $lte: thresholdValue };
    }

    const pipeline = [
      { $match: match },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { sku: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { productId: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { stockQty: 1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      {
        $project: {
          _id: 1,
          sku: 1,
          name: 1,
          stockQty: 1,
          availableQty: '$stockQty',
          productId: 1,
        },
      },
    );

    const [items, totalAgg] = await Promise.all([
      Product.aggregate(pipeline),
      Product.aggregate([
        { $match: match },
        ...(search
          ? [
              {
                $match: {
                  $or: [
                    { sku: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } },
                    { productId: { $regex: search, $options: 'i' } },
                  ],
                },
              },
            ]
          : []),
        { $count: 'total' },
      ]),
    ]);

    const total = totalAgg[0]?.total || 0;

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async adjustStock({ productId, type = 'increase', quantity = 0, note = '' } = {}) {
    if (!productId) error('Product ID is required', 400);
    const qty = Number(quantity);
    if (!qty || qty <= 0) error('Quantity must be greater than 0', 400);

    const isDecrease = String(type).toLowerCase() === 'decrease';
    const delta = isDecrease ? -qty : qty;

    const match = {
      _id: productId,
      isDeleted: false,
    };

    if (isDecrease) {
      match.$expr = { $gte: ['$stockQty', qty] };
    }

    const updated = await Product.findOneAndUpdate(
      match,
      { $inc: { stockQty: delta } },
      { new: true },
    ).lean();

    if (!updated) {
      error(isDecrease ? 'Insufficient stock to decrease' : 'Product not found', 409);
    }

    await InventoryLog.create({
      productId,
      vendorId: updated.vendorId || undefined,
      changeType: 'admin_adjust',
      quantityChanged: Math.abs(delta),
      previousStock: updated.stockQty - delta,
      newStock: updated.stockQty,
      referenceId: 'admin_adjust',
      note: String(note || '').trim(),
    });

    await inventoryCache.del(productId);

    return {
      productId: updated._id,
      stockQty: updated.stockQty,
    };
  }
}

module.exports = new InventoryAdminService();
