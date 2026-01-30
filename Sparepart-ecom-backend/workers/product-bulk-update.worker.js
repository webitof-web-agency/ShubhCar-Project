const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  // eslint-disable-next-line no-console
  console.warn('Worker disabled: REDIS_URL not set');
  module.exports = { worker: null, disabled: true };
} else {
  const { Worker } = require('bullmq');
  const { connection } = require('../config/queue');
  const { connectRedis, redis } = require('../config/redis');
  const logger = require('../config/logger');
  const { logWorkerFailure } = require('../utils/workerLogger');
  const Product = require('../models/Product.model');
  const mongoose = require('mongoose');

  const BATCH_SIZE = 500;
  const RESULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

  connectRedis().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to connect Redis for bulk update worker', err);
  });

  let worker = null;

  const resolveRowIdentifier = (row) => {
    if (row.productId && mongoose.Types.ObjectId.isValid(row.productId)) {
      return { type: 'productId', value: String(row.productId) };
    }
    if (row.productCode) {
      return { type: 'productCode', value: String(row.productCode).trim().toUpperCase() };
    }
    if (row.sku) {
      return { type: 'sku', value: String(row.sku) };
    }
    return null;
  };

  const buildBulkOps = (rows, productIdMap, skuMap, productCodeMap) => {
    const ops = [];
    const skipped = [];

    rows.forEach((row) => {
      const identifier = resolveRowIdentifier(row);
      if (!identifier) {
        skipped.push({ row: row.rowNumber, reason: 'Missing identifier' });
        return;
      }

      let targetId = null;
      if (identifier.type === 'productId') {
        targetId = productIdMap.get(identifier.value) || null;
      } else if (identifier.type === 'productCode') {
        targetId = productCodeMap.get(identifier.value) || null;
      } else if (identifier.type === 'sku') {
        targetId = skuMap.get(identifier.value) || null;
      }

      if (!targetId) {
        skipped.push({ row: row.rowNumber, reason: 'Product not found' });
        return;
      }

      const retailMrp = Number(row.retailMrp);
      const retailSalePrice = Number(row.retailSalePrice);
      const wholesaleMrp = Number(row.wholesaleMrp);
      const wholesaleSalePrice = Number(row.wholesaleSalePrice);
      const stock = Number(row.stock);

      ops.push({
        updateOne: {
          filter: { _id: targetId },
          update: {
            $set: {
              'retailPrice.mrp': retailMrp,
              'retailPrice.salePrice': retailSalePrice,
              'wholesalePrice.mrp': wholesaleMrp,
              'wholesalePrice.salePrice': wholesaleSalePrice,
              stockQty: stock,
              updatedAt: new Date(),
            },
          },
        },
      });
    });

    return { ops, skipped };
  };

  try {
    worker = new Worker(
      'product-bulk-update',
      async (job) => {
        const { redisKey, total } = job.data || {};
        if (!redisKey) {
          throw new Error('Missing redisKey for bulk update job');
        }

        const raw = await redis.get(redisKey);
        if (!raw) {
          throw new Error('Upload data expired or missing');
        }

        const payload = JSON.parse(raw);
        const rows = payload.rows || [];
        const batchSize = Math.max(1, Number(job.data.batchSize) || BATCH_SIZE);

        let processed = 0;
        let success = 0;
        let failed = 0;
        let skipped = 0;

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const productIds = batch
            .filter((row) => row.productId && mongoose.Types.ObjectId.isValid(row.productId))
            .map((row) => String(row.productId));
          const productCodes = batch
            .filter((row) => !row.productId && row.productCode)
            .map((row) => String(row.productCode).trim().toUpperCase());
          const skus = batch
            .filter((row) => !row.productId && !row.productCode && row.sku)
            .map((row) => String(row.sku));

          const [productsById, productsBySku, productsByCode] = await Promise.all([
            productIds.length
              ? Product.find({ _id: { $in: productIds } })
                .select('_id')
                .lean()
              : [],
            skus.length
              ? Product.find({ sku: { $in: skus } })
                .select('_id sku')
                .lean()
              : [],
            productCodes.length
              ? Product.find({ productId: { $in: productCodes } })
                .select('_id productId')
                .lean()
              : [],
          ]);

          const productIdMap = new Map(
            productsById.map((product) => [String(product._id), product._id]),
          );
          const skuMap = new Map(
            productsBySku.map((product) => [String(product.sku), product._id]),
          );

          const productCodeMap = new Map(
            productsByCode.map((product) => [String(product.productId).toUpperCase(), product._id]),
          );

          const { ops, skipped: skippedRows } = buildBulkOps(batch, productIdMap, skuMap, productCodeMap);
          skipped += skippedRows.length;
          failed += skippedRows.length;

          if (skippedRows.length) {
            logger.warn('product_bulk_update_skipped_rows', {
              count: skippedRows.length,
              sample: skippedRows.slice(0, 10),
            });
          }

          if (ops.length) {
            try {
              await Product.bulkWrite(ops, { ordered: false });
              success += ops.length;
            } catch (err) {
              logger.error('product_bulk_update_bulkwrite_failed', {
                error: err.message,
              });
              failed += ops.length;
            }
          }

          processed += batch.length;
          await job.updateProgress({
            total: total || rows.length,
            processed,
            success,
            failed,
            skipped,
          });
        }

        await redis.del(redisKey);
        await redis.setEx(
          `bulk-price-stock:result:${job.id}`,
          RESULT_TTL_SECONDS,
          JSON.stringify({ total: rows.length, success, failed, skipped }),
        );

        return { total: rows.length, success, failed, skipped };
      },
      { connection },
    );

    worker.on('failed', (job, err) => {
      logWorkerFailure('product-bulk-update', job, err);
    });
  } catch (err) {
    logger.error('Product bulk update worker initialization failed', { error: err.message });
  }

  module.exports = { worker, disabled: false };
}
