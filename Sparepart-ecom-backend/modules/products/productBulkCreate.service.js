const ExcelJS = require('exceljs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const { error } = require('../../utils/apiResponse');
const { redis, redisEnabled } = require('../../config/redis');
const { productBulkCreateQueue } = require('../../queues/productBulkCreate.queue');
const Product = require('../../models/Product.model');
const Category = require('../../models/Category.model');
const Vehicle = require('../vehicle-management/models/Vehicle.model');

const UPLOAD_TTL_SECONDS = 60 * 60; // 1 hour
const VALID_HEADERS = {
  productcode: 'productCode',
  product_code: 'productCode',
  name: 'name',
  categorycode: 'categoryCode',
  category_code: 'categoryCode',
  categoryid: 'categoryId',
  category_id: 'categoryId',
  producttype: 'productType',
  manufacturerbrand: 'manufacturerBrand',
  vehiclebrand: 'vehicleBrand',
  oemnumber: 'oemNumber',
  sku: 'sku',
  hsncode: 'hsnCode',
  shortdescription: 'shortDescription',
  longdescription: 'longDescription',
  taxclasskey: 'taxClassKey',
  taxrate: 'taxRate',
  stockqty: 'stockQty',
  weight: 'weight',
  length: 'length',
  width: 'width',
  height: 'height',
  minorderqty: 'minOrderQty',
  minwholesaleqty: 'minWholesaleQty',
  retail_mrp: 'retailMrp',
  retail_mrp_price: 'retailMrp',
  retail_sale_price: 'retailSalePrice',
  wholesale_mrp: 'wholesaleMrp',
  wholesale_sale_price: 'wholesaleSalePrice',
  status: 'status',
  vehiclecodes: 'vehicleCodes',
  vehicle_codes: 'vehicleCodes',
  featured_image_url: 'featuredImageUrl',
  gallery_image_url_1: 'galleryImageUrl1',
  gallery_image_url_2: 'galleryImageUrl2',
  gallery_image_url_3: 'galleryImageUrl3',
  gallery_image_url_4: 'galleryImageUrl4',
  gallery_image_url_5: 'galleryImageUrl5',
};

const REQUIRED_HEADERS = ['productCode', 'name', 'categoryCode', 'productType', 'retailMrp'];
const PRODUCT_CODE_REGEX = /^PRO-\d{6}$/;
const VEHICLE_CODE_REGEX = /^VEH-\d{6}$/;
const CATEGORY_CODE_REGEX = /^(CAT|CATS)-\d{6}$/;

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
  if (value == null || value === '') return NaN;
  if (typeof value === 'number') return value;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : NaN;
};

const parseVehicleCodes = (value) => {
  if (!value) return [];
  return String(value)
    .split(/[,;|]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
};

const isValidUrl = (value) => {
  if (!value) return true;
  try {
    const parsed = new URL(String(value));
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (_err) {
    return false;
  }
};

const parseSheetRows = (sheet) => {
  const headerRow = sheet.getRow(1);
  const headerMap = {};
  headerRow.eachCell((cell, colNumber) => {
    const normalized = normalizeHeader(cell.value);
    const key = VALID_HEADERS[normalized];
    if (key) headerMap[key] = colNumber;
  });

  REQUIRED_HEADERS.forEach((header) => {
    if (!headerMap[header]) {
      error(`CSV must include ${header} column`, 400);
    }
  });

  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (!row || row.cellCount === 0) continue;

    const productCode = toCellString(row.getCell(headerMap.productCode)?.value);
    const name = toCellString(row.getCell(headerMap.name)?.value);
    const categoryCode = toCellString(row.getCell(headerMap.categoryCode)?.value);
    const categoryId = toCellString(row.getCell(headerMap.categoryId)?.value);
    const productType = toCellString(row.getCell(headerMap.productType)?.value).toUpperCase();
    const manufacturerBrand = toCellString(row.getCell(headerMap.manufacturerBrand)?.value);
    const vehicleBrand = toCellString(row.getCell(headerMap.vehicleBrand)?.value);
    const oemNumber = toCellString(row.getCell(headerMap.oemNumber)?.value);
    const sku = toCellString(row.getCell(headerMap.sku)?.value);
    const hsnCode = toCellString(row.getCell(headerMap.hsnCode)?.value);
    const shortDescription = toCellString(row.getCell(headerMap.shortDescription)?.value);
    const longDescription = toCellString(row.getCell(headerMap.longDescription)?.value);
    const taxClassKey = toCellString(row.getCell(headerMap.taxClassKey)?.value);
    const taxRate = toNumber(row.getCell(headerMap.taxRate)?.value);
    const stockQty = toNumber(row.getCell(headerMap.stockQty)?.value);
    const weight = toNumber(row.getCell(headerMap.weight)?.value);
    const length = toNumber(row.getCell(headerMap.length)?.value);
    const width = toNumber(row.getCell(headerMap.width)?.value);
    const height = toNumber(row.getCell(headerMap.height)?.value);
    const minOrderQty = toNumber(row.getCell(headerMap.minOrderQty)?.value);
    const minWholesaleQty = toNumber(row.getCell(headerMap.minWholesaleQty)?.value);
    const retailMrp = toNumber(row.getCell(headerMap.retailMrp)?.value);
    const retailSalePrice = toNumber(row.getCell(headerMap.retailSalePrice)?.value);
    const wholesaleMrp = toNumber(row.getCell(headerMap.wholesaleMrp)?.value);
    const wholesaleSalePrice = toNumber(row.getCell(headerMap.wholesaleSalePrice)?.value);
    const status = toCellString(row.getCell(headerMap.status)?.value);
    const vehicleCodes = parseVehicleCodes(row.getCell(headerMap.vehicleCodes)?.value);

    const featuredImageUrl = toCellString(row.getCell(headerMap.featuredImageUrl)?.value);
    const galleryImageUrl1 = toCellString(row.getCell(headerMap.galleryImageUrl1)?.value);
    const galleryImageUrl2 = toCellString(row.getCell(headerMap.galleryImageUrl2)?.value);
    const galleryImageUrl3 = toCellString(row.getCell(headerMap.galleryImageUrl3)?.value);
    const galleryImageUrl4 = toCellString(row.getCell(headerMap.galleryImageUrl4)?.value);
    const galleryImageUrl5 = toCellString(row.getCell(headerMap.galleryImageUrl5)?.value);

    rows.push({
      rowNumber,
      productCode: productCode || '',
      name: name || '',
      categoryCode: categoryCode || '',
      categoryId: categoryId || '',
      productType: productType || '',
      manufacturerBrand: manufacturerBrand || '',
      vehicleBrand: vehicleBrand || '',
      oemNumber: oemNumber || '',
      sku: sku || '',
      hsnCode: hsnCode || '',
      shortDescription: shortDescription || '',
      longDescription: longDescription || '',
      taxClassKey: taxClassKey || '',
      taxRate,
      stockQty,
      weight,
      length,
      width,
      height,
      minOrderQty,
      minWholesaleQty,
      retailMrp,
      retailSalePrice,
      wholesaleMrp,
      wholesaleSalePrice,
      status: status || '',
      vehicleCodes,
      featuredImageUrl: featuredImageUrl || '',
      galleryImageUrls: [
        galleryImageUrl1,
        galleryImageUrl2,
        galleryImageUrl3,
        galleryImageUrl4,
        galleryImageUrl5,
      ].filter(Boolean),
    });
  }

  return rows;
};

const validateRow = (row) => {
  const errors = [];
  if (!row.productCode) errors.push('Missing productCode');
  if (row.productCode && !PRODUCT_CODE_REGEX.test(String(row.productCode).toUpperCase())) {
    errors.push('Invalid productCode format');
  }
  if (!row.name) errors.push('Missing product name');
  if (!row.categoryCode) errors.push('Missing categoryCode');
  if (row.categoryCode && !CATEGORY_CODE_REGEX.test(String(row.categoryCode).toUpperCase())) {
    errors.push('Invalid categoryCode format');
  }
  if (!row.productType) errors.push('Missing productType');

  if (row.productType && !['OEM', 'AFTERMARKET'].includes(row.productType)) {
    errors.push('Invalid productType');
  }

  if (row.productType === 'OEM') {
    if (!row.vehicleBrand) errors.push('Vehicle brand is required for OEM products');
    if (!row.oemNumber) errors.push('OEM number is required for OEM products');
  }

  if (row.productType === 'AFTERMARKET') {
    if (!row.manufacturerBrand) errors.push('Manufacturer brand is required for Aftermarket products');
  }

  if (!Number.isFinite(row.retailMrp)) {
    errors.push('Invalid retail_mrp');
  } else if (row.retailMrp < 0) {
    errors.push('retail_mrp must be >= 0');
  }

  if (Number.isFinite(row.retailSalePrice) && row.retailSalePrice < 0) {
    errors.push('retail_sale_price must be >= 0');
  }

  if (Number.isFinite(row.wholesaleMrp) && row.wholesaleMrp < 0) {
    errors.push('wholesale_mrp must be >= 0');
  }

  if (Number.isFinite(row.wholesaleSalePrice) && row.wholesaleSalePrice < 0) {
    errors.push('wholesale_sale_price must be >= 0');
  }

  const minOrder = Number.isFinite(row.minOrderQty) ? row.minOrderQty : null;
  if (minOrder !== null && minOrder < 1) errors.push('minOrderQty must be >= 1');

  const minWholesale = Number.isFinite(row.minWholesaleQty) ? row.minWholesaleQty : null;
  if (minWholesale !== null && minWholesale < 1) errors.push('minWholesaleQty must be >= 1');

  const stock = Number.isFinite(row.stockQty) ? row.stockQty : null;
  if (stock !== null && stock < 0) errors.push('stockQty must be >= 0');

  const taxRate = Number.isFinite(row.taxRate) ? row.taxRate : null;
  if (taxRate !== null && taxRate < 0) errors.push('taxRate must be >= 0');

  ['weight', 'length', 'width', 'height'].forEach((field) => {
    const value = row[field];
    if (Number.isFinite(value) && value < 0) {
      errors.push(`${field} must be >= 0`);
    }
  });

  const status = row.status ? row.status.toLowerCase() : '';
  if (status && !['draft', 'active', 'inactive', 'blocked'].includes(status)) {
    errors.push('Invalid status');
  }

  if (row.categoryId && !mongoose.Types.ObjectId.isValid(row.categoryId)) {
    errors.push('Invalid categoryId');
  }

  if (row.featuredImageUrl && !isValidUrl(row.featuredImageUrl)) {
    errors.push('Invalid featured image URL');
  }

  row.galleryImageUrls.forEach((url) => {
    if (!isValidUrl(url)) errors.push(`Invalid gallery image URL: ${url}`);
  });

  row.vehicleCodes.forEach((code) => {
    const normalized = String(code).toUpperCase();
    if (!VEHICLE_CODE_REGEX.test(normalized)) {
      errors.push(`Invalid vehicleCode format: ${code}`);
    }
  });

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
  const key = `bulk-create:upload:${uploadId}`;
  await redis.setEx(key, UPLOAD_TTL_SECONDS, JSON.stringify(payload));
  return key;
};

const loadUpload = async (uploadId) => {
  const key = `bulk-create:upload:${uploadId}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  return { key, payload: JSON.parse(raw) };
};

class ProductBulkCreateService {
  async preview(file, actor) {
    const rows = await parseUpload(file);
    const invalidRows = [];
    const validRows = [];

    const rowMap = rows.map((row) => ({
      ...row,
      productCode: row.productCode.trim().toUpperCase(),
      categoryCode: row.categoryCode.trim().toUpperCase(),
      vehicleCodes: row.vehicleCodes.map((code) => code.toUpperCase()),
      _errors: [],
    }));

    rowMap.forEach((row) => {
      const rowErrors = validateRow(row);
      if (rowErrors.length) {
        row._errors.push(...rowErrors);
      }
    });

    const codeCounts = new Map();
    rowMap.forEach((row) => {
      const code = row.productCode.trim().toUpperCase();
      if (!code) return;
      codeCounts.set(code, (codeCounts.get(code) || 0) + 1);
    });

    rowMap.forEach((row) => {
      const code = row.productCode.trim().toUpperCase();
      if (code && codeCounts.get(code) > 1) {
        row._errors.push('Duplicate productCode in sheet');
      }
    });

    const validCodes = rowMap
      .filter((row) => row._errors.length === 0)
      .map((row) => row.productCode.trim().toUpperCase());

    if (validCodes.length) {
      const existing = await Product.find({ productId: { $in: validCodes } })
        .select('productId')
        .lean();
      const existingCodes = new Set(existing.map((item) => String(item.productId).toUpperCase()));
      rowMap.forEach((row) => {
        const code = row.productCode.trim().toUpperCase();
        if (existingCodes.has(code)) {
          row._errors.push('productCode already exists');
        }
      });
    }

    const categoryCodes = Array.from(new Set(
      rowMap
        .filter((row) => row._errors.length === 0)
        .map((row) => row.categoryCode),
    ));

    if (categoryCodes.length) {
      const categories = await Category.find({ categoryCode: { $in: categoryCodes } })
        .select('_id categoryCode')
        .lean();
      const categoryMap = new Map(
        categories.map((item) => [String(item.categoryCode).toUpperCase(), String(item._id)]),
      );
      rowMap.forEach((row) => {
        if (row._errors.length) return;
        const id = categoryMap.get(row.categoryCode);
        if (!id) {
          row._errors.push('categoryCode not found');
        } else {
          row.categoryId = id;
        }
      });
    }

    const vehicleCodes = Array.from(new Set(
      rowMap
        .filter((row) => row._errors.length === 0)
        .flatMap((row) => row.vehicleCodes),
    ));

    if (vehicleCodes.length) {
      const vehicles = await Vehicle.find({ vehicleCode: { $in: vehicleCodes } })
        .select('vehicleCode')
        .lean();
      const vehicleSet = new Set(vehicles.map((item) => String(item.vehicleCode).toUpperCase()));

      rowMap.forEach((row) => {
        if (row._errors.length) return;
        const missing = row.vehicleCodes.filter((code) => !vehicleSet.has(code));
        if (missing.length) {
          row._errors.push(`Unknown vehicleCodes: ${missing.join(', ')}`);
        }
      });
    }

    rowMap.forEach((row) => {
      if (row._errors.length) {
        invalidRows.push({
          row: row.rowNumber,
          productCode: row.productCode || null,
          name: row.name || null,
          reason: row._errors.join('; '),
        });
      } else {
        validRows.push({
          ...row,
          productType: row.productType.toUpperCase(),
          status: row.status ? row.status.toLowerCase() : '',
        });
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

    const job = await productBulkCreateQueue.add(
      'bulk-product-create',
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

    const job = await productBulkCreateQueue.getJob(jobId);
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

module.exports = new ProductBulkCreateService();
