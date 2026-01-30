const ExcelJS = require('exceljs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const { error } = require('../../utils/apiResponse');
const { redis, redisEnabled } = require('../../config/redis');
const { productBulkUpdateQueue } = require('../../queues/productBulkUpdate.queue');

const UPLOAD_TTL_SECONDS = 60 * 60; // 1 hour
const VALID_HEADERS = {
  productcode: 'productCode',
  product_code: 'productCode',
  productid: 'productId',
  product_id: 'productId',
  sku: 'sku',
  productname: 'productName',
  product_name: 'productName',
  retail_mrp: 'retailMrp',
  retail_sale_price: 'retailSalePrice',
  wholesale_mrp: 'wholesaleMrp',
  wholesale_sale_price: 'wholesaleSalePrice',
  stock: 'stock',
};

const PRODUCT_CODE_REGEX = /^PRO-\d{6}$/;

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const toCellString = (value) => {
  if (value == null) return '';
  if (typeof value === 'object') {
    if (value.text) return String(value.text).trim();
    if (value.result) return String(value.result).trim();
  }
  return String(value).trim();
};

const toNumber = (value) => {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : NaN;
};

const parseSheetRows = (sheet) => {
  const headerRow = sheet.getRow(1);
  const headerMap = {};
  headerRow.eachCell((cell, colNumber) => {
    const normalized = normalizeHeader(cell.value);
    const key = VALID_HEADERS[normalized];
    if (key) headerMap[key] = colNumber;
  });

  if (!headerMap.productId && !headerMap.productCode && !headerMap.sku) {
    error('CSV must include productCode, productId, or sku column', 400);
  }
  if (!headerMap.retailMrp || !headerMap.retailSalePrice || !headerMap.wholesaleMrp || !headerMap.wholesaleSalePrice || !headerMap.stock) {
    error('CSV must include retail_mrp, retail_sale_price, wholesale_mrp, wholesale_sale_price, and stock columns', 400);
  }

  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (!row || row.cellCount === 0) continue;

    const productId = toCellString(row.getCell(headerMap.productId)?.value);
    const productCode = toCellString(row.getCell(headerMap.productCode)?.value);
    const sku = toCellString(row.getCell(headerMap.sku)?.value);
    const productName = toCellString(row.getCell(headerMap.productName)?.value);
    const retailMrp = toNumber(row.getCell(headerMap.retailMrp)?.value);
    const retailSalePrice = toNumber(row.getCell(headerMap.retailSalePrice)?.value);
    const wholesaleMrp = toNumber(row.getCell(headerMap.wholesaleMrp)?.value);
    const wholesaleSalePrice = toNumber(row.getCell(headerMap.wholesaleSalePrice)?.value);
    const stock = toNumber(row.getCell(headerMap.stock)?.value);

    rows.push({
      rowNumber,
      productId: productId || '',
      productCode: productCode || '',
      sku: sku || '',
      productName: productName || '',
      retailMrp,
      retailSalePrice,
      wholesaleMrp,
      wholesaleSalePrice,
      stock,
    });
  }

  return rows;
};

const validateRow = (row) => {
  const errors = [];
  const hasProductId = Boolean(row.productId);
  const hasProductCode = Boolean(row.productCode);
  const hasSku = Boolean(row.sku);

  if (!hasProductId && !hasProductCode && !hasSku) {
    errors.push('Missing productCode, productId or sku');
  }
  if (hasProductCode && !PRODUCT_CODE_REGEX.test(String(row.productCode).toUpperCase())) {
    errors.push('Invalid productCode format');
  }
  if (hasProductId && !mongoose.Types.ObjectId.isValid(row.productId)) {
    errors.push('Invalid productId');
  }
  if (!Number.isFinite(row.retailMrp)) {
    errors.push('Invalid retail_mrp');
  } else if (row.retailMrp < 0) {
    errors.push('retail_mrp must be >= 0');
  }
  if (!Number.isFinite(row.retailSalePrice)) {
    errors.push('Invalid retail_sale_price');
  } else if (row.retailSalePrice < 0) {
    errors.push('retail_sale_price must be >= 0');
  }
  if (!Number.isFinite(row.wholesaleMrp)) {
    errors.push('Invalid wholesale_mrp');
  } else if (row.wholesaleMrp < 0) {
    errors.push('wholesale_mrp must be >= 0');
  }
  if (!Number.isFinite(row.wholesaleSalePrice)) {
    errors.push('Invalid wholesale_sale_price');
  } else if (row.wholesaleSalePrice < 0) {
    errors.push('wholesale_sale_price must be >= 0');
  }
  if (!Number.isFinite(row.stock)) {
    errors.push('Invalid stock');
  } else if (row.stock < 0) {
    errors.push('Stock must be >= 0');
  }

  return errors;
};

const parseUpload = async (file) => {
  if (!file) error('File is required', 400);
  if (!redisEnabled) error('Redis is required for bulk updates', 503);

  const workbook = new ExcelJS.Workbook();
  const ext = (file.originalname || '').toLowerCase();

  if (ext.endsWith('.csv')) {
    await workbook.csv.read(Readable.from(file.buffer.toString('utf8')));
  } else if (ext.endsWith('.xlsx')) {
    await workbook.xlsx.load(file.buffer);
  } else {
    error('Only CSV or XLSX files are allowed', 400);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) error('No worksheet found', 400);

  return parseSheetRows(sheet);
};

const storeUpload = async (uploadId, payload) => {
  const key = `bulk-price-stock:upload:${uploadId}`;
  await redis.setEx(key, UPLOAD_TTL_SECONDS, JSON.stringify(payload));
  return key;
};

const loadUpload = async (uploadId) => {
  const key = `bulk-price-stock:upload:${uploadId}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  return { key, payload: JSON.parse(raw) };
};

class ProductBulkUpdateService {
  async preview(file, actor) {
    const rows = await parseUpload(file);
    const invalidRows = [];
    const validRows = [];

    rows.forEach((row) => {
      const rowErrors = validateRow(row);
      if (rowErrors.length) {
        invalidRows.push({
          row: row.rowNumber,
          productId: row.productId || null,
          sku: row.sku || null,
          productName: row.productName || null,
          reason: rowErrors.join('; '),
        });
      } else {
        validRows.push(row);
      }
    });

    const uploadId = crypto.randomUUID();
    await storeUpload(uploadId, {
      adminId: actor?.id || actor?._id || null,
      fileName: file.originalname,
      createdAt: new Date().toISOString(),
      rows: validRows,
    });

    return {
      uploadId,
      totalRows: rows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      errors: invalidRows,
    };
  }

  async confirm(uploadId, actor) {
    if (!redisEnabled) error('Redis is required for bulk updates', 503);
    if (!uploadId) error('uploadId is required', 400);

    const entry = await loadUpload(uploadId);
    if (!entry) error('Upload not found or expired', 404);

    const { payload, key } = entry;
    const total = payload.rows.length;

    const job = await productBulkUpdateQueue.add(
      'bulk-price-stock-update',
      {
        redisKey: key,
        uploadId,
        adminId: actor?.id || actor?._id || null,
        fileName: payload.fileName,
        total,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      jobId: job.id,
      status: 'queued',
      total,
    };
  }

  async getJobStatus(jobId) {
    if (!redisEnabled) error('Redis is required for bulk updates', 503);
    if (!jobId) error('jobId is required', 400);

    const job = await productBulkUpdateQueue.getJob(jobId);
    if (!job) error('Job not found', 404);

    const state = await job.getState();
    return {
      jobId: job.id,
      status: state,
      progress: job.progress || {
        total: job.data?.total || 0,
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
      },
      total: job.data?.total || 0,
      result: job.returnvalue || null,
    };
  }
}

module.exports = new ProductBulkUpdateService();
