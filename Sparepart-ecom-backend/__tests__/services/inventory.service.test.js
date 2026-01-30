/**
 * Inventory service controls oversell prevention and low-stock alerts.
 * These tests use real Mongo (in-memory) to verify atomicity of stock moves.
 */
jest.mock('../../cache/inventory.cache', () => ({
  del: jest.fn(),
}));
jest.mock('../../queues/email.queue', () => ({
  enqueueEmail: jest.fn(),
}));

const mongoose = require('mongoose');
const inventoryService = require('../../modules/inventory/inventory.service');
const ProductVariant = require('../../models/ProductVariant.model');
const inventoryCache = require('../../cache/inventory.cache');
const { enqueueEmail } = require('../../queues/email.queue');
const { AppError } = require('../../utils/apiResponse');
const {
  connectTestDB,
  clearDatabase,
  disconnectTestDB,
} = require('../helpers/mongo');

describe('InventoryService', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it('reserves stock when available and invalidates cache', async () => {
    const variant = await ProductVariant.create({
      productId: new mongoose.Types.ObjectId(),
      variantName: 'Red / L',
      sku: 'SKU-1',
      price: 100,
      stockQty: 10,
      reservedQty: 2,
    });

    await inventoryService.reserve(variant._id, 3);

    const updated = await ProductVariant.findById(variant._id).lean();
    expect(updated.reservedQty).toBe(5); // 2 existing + 3 reserved
    expect(inventoryCache.del).toHaveBeenCalledWith(variant._id);
  });

  it('throws when reserving more than available stock to prevent oversell', async () => {
    const variant = await ProductVariant.create({
      productId: new mongoose.Types.ObjectId(),
      variantName: 'Blue / M',
      sku: 'SKU-2',
      price: 80,
      stockQty: 2,
      reservedQty: 0,
    });

    await expect(
      inventoryService.reserve(variant._id, 5),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('commits reserved stock and sends low-stock alert when below threshold', async () => {
    process.env.LOW_STOCK_THRESHOLD = '5';
    const variant = await ProductVariant.create({
      productId: new mongoose.Types.ObjectId(),
      variantName: 'Green / S',
      sku: 'SKU-3',
      price: 120,
      stockQty: 6,
      reservedQty: 2,
    });

    const committed = await inventoryService.commit(variant._id, 2);

    expect(committed.stockQty).toBe(4); // dropped below threshold
    expect(committed.reservedQty).toBe(0);
    expect(inventoryCache.del).toHaveBeenCalledWith(variant._id);
    expect(enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: 'inventory_low_stock',
      }),
    );
  });

  it('releases reserved stock on cancel/failure', async () => {
    const variant = await ProductVariant.create({
      productId: new mongoose.Types.ObjectId(),
      variantName: 'Black / XL',
      sku: 'SKU-4',
      price: 150,
      stockQty: 5,
      reservedQty: 3,
    });

    const released = await inventoryService.release(variant._id, 2);

    expect(released.reservedQty).toBe(1);
    expect(inventoryCache.del).toHaveBeenCalledWith(variant._id);
  });
});
