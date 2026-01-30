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
  const ProductImage = require('../models/ProductImage.model');
  const ProductCompatibility = require('../models/ProductCompatibility.model');
  const Vehicle = require('../modules/vehicle-management/models/Vehicle.model');
  const slugify = require('slugify');
  const sanitize = require('../utils/sanitizeHtml');
  const { deletePatterns } = require('../lib/cache/invalidate');

  const BATCH_SIZE = 200;
  const RESULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

  connectRedis().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to connect Redis for bulk create worker', err);
  });

  let worker = null;

  const toNumberOrNull = (value) =>
    Number.isFinite(value) ? value : null;

  const normalizeSlug = (name, fallback) => {
    const base = slugify(name || fallback || '', { lower: true, strict: true, trim: true });
    if (base) return base;
    return slugify(fallback || 'product', { lower: true, strict: true, trim: true });
  };

  const buildUniqueSlug = (name, productCode, usedSlugs, existingSlugs) => {
    const base = normalizeSlug(name, productCode || 'product');
    let next = base || productCode || `product-${Math.random().toString(36).slice(2, 8)}`;
    if (existingSlugs.has(next) || usedSlugs.has(next)) {
      next = `${base || 'product'}-${String(productCode || '').toLowerCase()}`;
    }
    let counter = 1;
    while (existingSlugs.has(next) || usedSlugs.has(next)) {
      next = `${base || 'product'}-${String(productCode || '').toLowerCase()}-${counter}`;
      counter += 1;
    }
    usedSlugs.add(next);
    return next;
  };

  const buildProductDocs = (rows, existingSlugs) => {
    const usedSlugs = new Set();
    return rows.map((row) => {
      const retailPrice = {
        mrp: Number(row.retailMrp),
      };
      if (Number.isFinite(row.retailSalePrice)) {
        retailPrice.salePrice = Number(row.retailSalePrice);
      }

      let wholesalePrice = undefined;
      if (Number.isFinite(row.wholesaleMrp)) {
        wholesalePrice = { mrp: Number(row.wholesaleMrp) };
        if (Number.isFinite(row.wholesaleSalePrice)) {
          wholesalePrice.salePrice = Number(row.wholesaleSalePrice);
        }
      }

      const status = row.status && ['draft', 'active', 'inactive', 'blocked'].includes(row.status)
        ? row.status
        : 'draft';

      const payload = {
        productId: row.productCode,
        name: row.name,
        slug: buildUniqueSlug(row.name, row.productCode, usedSlugs, existingSlugs),
        categoryId: row.categoryId,
        productType: row.productType,
        manufacturerBrand: row.productType === 'AFTERMARKET' ? row.manufacturerBrand : null,
        vehicleBrand: row.productType === 'OEM' ? row.vehicleBrand : null,
        oemNumber: row.productType === 'OEM' ? row.oemNumber : null,
        sku: row.sku || undefined,
        hsnCode: row.hsnCode || undefined,
        shortDescription: row.shortDescription ? sanitize(row.shortDescription) : undefined,
        longDescription: row.longDescription ? sanitize(row.longDescription) : undefined,
        taxClassKey: row.taxClassKey || undefined,
        taxRate: toNumberOrNull(row.taxRate) ?? undefined,
        stockQty: Number.isFinite(row.stockQty) ? Number(row.stockQty) : 0,
        weight: toNumberOrNull(row.weight) ?? undefined,
        length: toNumberOrNull(row.length) ?? undefined,
        width: toNumberOrNull(row.width) ?? undefined,
        height: toNumberOrNull(row.height) ?? undefined,
        minOrderQty: Number.isFinite(row.minOrderQty) ? Number(row.minOrderQty) : 1,
        minWholesaleQty: toNumberOrNull(row.minWholesaleQty) ?? undefined,
        retailPrice,
        wholesalePrice,
        status,
        vendorId: null,
        listingFeeStatus: 'waived',
      };

      return payload;
    });
  };

  const extractImageDocs = (productRow, productId, productName) => {
    const featured = productRow.featuredImageUrl || '';
    const gallery = Array.isArray(productRow.galleryImageUrls)
      ? productRow.galleryImageUrls.filter(Boolean)
      : [];

    const images = [];
    if (featured) {
      images.push({
        productId,
        url: featured,
        altText: productName || 'Product',
        isPrimary: true,
        sortOrder: 0,
      });
    }

    gallery.forEach((url, index) => {
      if (!url) return;
      images.push({
        productId,
        url,
        altText: productName || 'Product',
        isPrimary: !featured && index === 0,
        sortOrder: featured ? index + 1 : index,
      });
    });

    return images;
  };

  const resolveVehicleMap = async (rows) => {
    const vehicleCodes = new Set();
    rows.forEach((row) => {
      (row.vehicleCodes || []).forEach((code) => vehicleCodes.add(String(code).toUpperCase()));
    });

    if (!vehicleCodes.size) return new Map();

    const vehicles = await Vehicle.find({ vehicleCode: { $in: Array.from(vehicleCodes) } })
      .select('_id vehicleCode')
      .lean();

    return new Map(vehicles.map((item) => [String(item.vehicleCode).toUpperCase(), item._id]));
  };

  try {
    worker = new Worker(
      'product-bulk-create',
      async (job) => {
        const { redisKey, total } = job.data || {};
        if (!redisKey) throw new Error('Missing redisKey for bulk create job');

        const raw = await redis.get(redisKey);
        if (!raw) throw new Error('Upload data expired or missing');

        const payload = JSON.parse(raw);
        const rows = payload.rows || [];
        const batchSize = Math.max(1, Number(job.data.batchSize) || BATCH_SIZE);

        let processed = 0;
        let success = 0;
        let failed = 0;
        let skipped = 0;

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const productCodes = batch.map((row) => String(row.productCode).toUpperCase());

          const existingProducts = await Product.find({ productId: { $in: productCodes } })
            .select('productId')
            .lean();
          const existingSet = new Set(existingProducts.map((item) => String(item.productId).toUpperCase()));

          const toInsertRows = batch.filter((row) => !existingSet.has(String(row.productCode).toUpperCase()));
          const skippedRows = batch.filter((row) => existingSet.has(String(row.productCode).toUpperCase()));

          skipped += skippedRows.length;
          failed += skippedRows.length;

          if (skippedRows.length) {
            logger.warn('product_bulk_create_skipped_rows', {
              count: skippedRows.length,
              sample: skippedRows.slice(0, 10).map((row) => ({
                row: row.rowNumber,
                productCode: row.productCode,
                reason: 'productCode already exists',
              })),
            });
          }

          if (toInsertRows.length) {
            const slugsToCheck = toInsertRows.map((row) => normalizeSlug(row.name, row.productCode));
            const existingSlugs = await Product.find({ slug: { $in: slugsToCheck } })
              .select('slug')
              .lean();
            const existingSlugSet = new Set(existingSlugs.map((item) => item.slug));

            const docs = buildProductDocs(toInsertRows, existingSlugSet);

            try {
              await Product.bulkWrite(
                docs.map((doc) => ({ insertOne: { document: doc } })),
                { ordered: false },
              );
            } catch (err) {
              logger.error('product_bulk_create_insert_failed', { error: err.message });
            }

            const insertedProducts = await Product.find({
              productId: { $in: toInsertRows.map((row) => row.productCode) },
            })
              .select('_id productId name slug')
              .lean();
            const insertedMap = new Map(
              insertedProducts.map((item) => [String(item.productId).toUpperCase(), item]),
            );

            const vehicleMap = await resolveVehicleMap(toInsertRows);

            const imageDocs = [];
            const compatOps = [];

            toInsertRows.forEach((row) => {
              const inserted = insertedMap.get(String(row.productCode).toUpperCase());
              if (!inserted) {
                failed += 1;
                return;
              }

              success += 1;

              imageDocs.push(...extractImageDocs(row, inserted._id, inserted.name));

              if (row.vehicleCodes && row.vehicleCodes.length) {
                const vehicleIds = row.vehicleCodes
                  .map((code) => vehicleMap.get(String(code).toUpperCase()))
                  .filter(Boolean);

                if (vehicleIds.length) {
                  compatOps.push({
                    updateOne: {
                      filter: { productId: inserted._id },
                      update: { $set: { vehicleIds } },
                      upsert: true,
                    },
                  });
                }
              }
            });

            if (imageDocs.length) {
              await ProductImage.insertMany(imageDocs, { ordered: false });
            }

            if (compatOps.length) {
              await ProductCompatibility.bulkWrite(compatOps, { ordered: false });
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
          `bulk-create:result:${job.id}`,
          RESULT_TTL_SECONDS,
          JSON.stringify({ total: rows.length, success, failed, skipped }),
        );

        await deletePatterns(['catalog:products:*']);

        return { total: rows.length, success, failed, skipped };
      },
      { connection },
    );

    worker.on('failed', (job, err) => {
      logWorkerFailure('product-bulk-create', job, err);
    });
  } catch (err) {
    logger.error('Product bulk create worker initialization failed', { error: err.message });
  }

  module.exports = { worker, disabled: false };
}
