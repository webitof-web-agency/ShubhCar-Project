const ExcelJS = require('exceljs');
const Product = require('../../models/Product.model');
const ProductImage = require('../../models/ProductImage.model');
const ProductCompatibility = require('../../models/ProductCompatibility.model');
const Category = require('../../models/Category.model');
const Vehicle = require('../vehicle-management/models/Vehicle.model');
const { generateProductCode, generateVehicleCode, generateCategoryCode, generateSubCategoryCode } = require('../../utils/numbering');

const PRODUCT_CODE_REGEX = /^PRO-\d{6}$/;
const VEHICLE_CODE_REGEX = /^VEH-\d{6}$/;
const CATEGORY_CODE_REGEX = /^(CAT|CATS)-\d{6}$/;

const ensureProductCodes = async (products = []) => {
  const missing = products.filter((item) => !item.productId || !PRODUCT_CODE_REGEX.test(item.productId));
  if (!missing.length) return;

  const existingCodes = await Product.find({ productId: { $ne: null } })
    .select('productId')
    .lean();
  const used = new Set(existingCodes.map((item) => item.productId));
  const updates = [];

  for (const item of missing) {
    let next = await generateProductCode();
    while (used.has(next)) {
      next = await generateProductCode();
    }
    used.add(next);
    item.productId = next;
    updates.push({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { productId: next } },
      },
    });
  }

  if (updates.length) {
    await Product.bulkWrite(updates, { ordered: false });
  }
};

const ensureVehicleCodes = async (vehicles = []) => {
  const missing = vehicles.filter((item) => !item.vehicleCode || !VEHICLE_CODE_REGEX.test(item.vehicleCode));
  if (!missing.length) return;

  const existingCodes = await Vehicle.find({ vehicleCode: { $ne: null } })
    .select('vehicleCode')
    .lean();
  const used = new Set(existingCodes.map((item) => item.vehicleCode));
  const updates = [];

  for (const item of missing) {
    let next = await generateVehicleCode();
    while (used.has(next)) {
      next = await generateVehicleCode();
    }
    used.add(next);
    item.vehicleCode = next;
    updates.push({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { vehicleCode: next } },
      },
    });
  }

  if (updates.length) {
    await Vehicle.bulkWrite(updates, { ordered: false });
  }
};

const ensureCategoryCodes = async (categories = []) => {
  const missing = categories.filter((item) => !item.categoryCode || !CATEGORY_CODE_REGEX.test(item.categoryCode));
  if (!missing.length) return;

  const existingCodes = await Category.find({ categoryCode: { $ne: null } })
    .select('categoryCode')
    .lean();
  const used = new Set(existingCodes.map((item) => item.categoryCode));
  const updates = [];

  for (const category of missing) {
    let next = category.parentId ? await generateSubCategoryCode() : await generateCategoryCode();
    while (used.has(next)) {
      next = category.parentId ? await generateSubCategoryCode() : await generateCategoryCode();
    }
    used.add(next);
    category.categoryCode = next;
    updates.push({
      updateOne: {
        filter: { _id: category._id },
        update: { $set: { categoryCode: next } },
      },
    });
  }

  if (updates.length) {
    await Category.bulkWrite(updates, { ordered: false });
  }
};

const toCsvBuffer = async (workbook) => {
  const buffer = await workbook.csv.writeBuffer();
  return Buffer.from(buffer);
};

const toXlsxBuffer = async (workbook) => {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const buildWorkbook = (headers, rows, sheetName) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = headers.map((header) => ({
    header: header.label,
    key: header.key,
  }));
  rows.forEach((row) => sheet.addRow(row));
  return workbook;
};

const bulkCreateHeaders = [
  { key: 'productCode', label: 'productCode*' },
  { key: 'name', label: 'name*' },
  { key: 'categoryCode', label: 'categoryCode*' },
  { key: 'productType', label: 'productType*' },
  { key: 'manufacturerBrand', label: 'manufacturerBrand' },
  { key: 'vehicleBrand', label: 'vehicleBrand' },
  { key: 'oemNumber', label: 'oemNumber' },
  { key: 'sku', label: 'sku' },
  { key: 'hsnCode', label: 'hsnCode' },
  { key: 'shortDescription', label: 'shortDescription' },
  { key: 'longDescription', label: 'longDescription' },
  { key: 'taxClassKey', label: 'taxClassKey' },
  { key: 'taxRate', label: 'taxRate' },
  { key: 'stockQty', label: 'stockQty' },
  { key: 'weight', label: 'weight' },
  { key: 'length', label: 'length' },
  { key: 'width', label: 'width' },
  { key: 'height', label: 'height' },
  { key: 'minOrderQty', label: 'minOrderQty' },
  { key: 'minWholesaleQty', label: 'minWholesaleQty' },
  { key: 'retail_mrp', label: 'retail_mrp*' },
  { key: 'retail_sale_price', label: 'retail_sale_price' },
  { key: 'wholesale_mrp', label: 'wholesale_mrp' },
  { key: 'wholesale_sale_price', label: 'wholesale_sale_price' },
  { key: 'status', label: 'status' },
  { key: 'vehicleCodes', label: 'vehicleCodes' },
  { key: 'featured_image_url', label: 'featured_image_url' },
  { key: 'gallery_image_url_1', label: 'gallery_image_url_1' },
  { key: 'gallery_image_url_2', label: 'gallery_image_url_2' },
  { key: 'gallery_image_url_3', label: 'gallery_image_url_3' },
  { key: 'gallery_image_url_4', label: 'gallery_image_url_4' },
  { key: 'gallery_image_url_5', label: 'gallery_image_url_5' },
];

const bulkUpdateHeaders = [
  { key: 'productCode', label: 'productCode*' },
  { key: 'sku', label: 'sku' },
  { key: 'productName', label: 'productName' },
  { key: 'retail_mrp', label: 'retail_mrp*' },
  { key: 'retail_sale_price', label: 'retail_sale_price*' },
  { key: 'wholesale_mrp', label: 'wholesale_mrp*' },
  { key: 'wholesale_sale_price', label: 'wholesale_sale_price*' },
  { key: 'stock', label: 'stock*' },
];

class ProductBulkExportService {
  async getBulkCreateTemplate(format = 'csv') {
    const workbook = buildWorkbook(bulkCreateHeaders, [], 'Bulk Create');
    const isXlsx = String(format || '').toLowerCase() === 'xlsx';
    const buffer = isXlsx ? await toXlsxBuffer(workbook) : await toCsvBuffer(workbook);
    return {
      buffer,
      filename: `product_bulk_create_template.${isXlsx ? 'xlsx' : 'csv'}`,
      contentType: isXlsx
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
    };
  }

  async getBulkUpdateTemplate(format = 'csv') {
    const workbook = buildWorkbook(bulkUpdateHeaders, [], 'Bulk Update');
    const isXlsx = String(format || '').toLowerCase() === 'xlsx';
    const buffer = isXlsx ? await toXlsxBuffer(workbook) : await toCsvBuffer(workbook);
    return {
      buffer,
      filename: `product_bulk_update_template.${isXlsx ? 'xlsx' : 'csv'}`,
      contentType: isXlsx
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
    };
  }

  async exportBulkUpdate(format = 'csv') {
    const products = await Product.find({ isDeleted: false })
      .select('productId name sku retailPrice wholesalePrice stockQty')
      .lean();

    await ensureProductCodes(products);

    const rows = products.map((product) => {
      const retailMrp = product.retailPrice?.mrp ?? 0;
      const retailSale = product.retailPrice?.salePrice ?? retailMrp;
      const wholesaleMrp = product.wholesalePrice?.mrp ?? 0;
      const wholesaleSale = product.wholesalePrice?.salePrice ?? wholesaleMrp;

      return {
        productCode: product.productId || '',
        sku: product.sku || '',
        productName: product.name || '',
        retail_mrp: retailMrp,
        retail_sale_price: retailSale,
        wholesale_mrp: wholesaleMrp,
        wholesale_sale_price: wholesaleSale,
        stock: product.stockQty ?? 0,
      };
    });

    const workbook = buildWorkbook(bulkUpdateHeaders, rows, 'Bulk Update');
    const isXlsx = String(format || '').toLowerCase() === 'xlsx';
    const buffer = isXlsx ? await toXlsxBuffer(workbook) : await toCsvBuffer(workbook);
    return {
      buffer,
      filename: `product_bulk_update_export.${isXlsx ? 'xlsx' : 'csv'}`,
      contentType: isXlsx
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
    };
  }

  async exportBulkCreate(format = 'csv') {
    const products = await Product.find({ isDeleted: false })
      .select([
        'productId',
        'name',
        'categoryId',
        'productType',
        'manufacturerBrand',
        'vehicleBrand',
        'oemNumber',
        'sku',
        'hsnCode',
        'shortDescription',
        'longDescription',
        'taxClassKey',
        'taxRate',
        'stockQty',
        'weight',
        'length',
        'width',
        'height',
        'minOrderQty',
        'minWholesaleQty',
        'retailPrice',
        'wholesalePrice',
        'status',
      ])
      .lean();

    await ensureProductCodes(products);

    const productIds = products.map((item) => item._id);
    const categoryIds = products.map((item) => item.categoryId).filter(Boolean);
    const [images, compat, categories] = await Promise.all([
      ProductImage.find({ productId: { $in: productIds }, isDeleted: false })
        .sort({ isPrimary: -1, sortOrder: 1 })
        .lean(),
      ProductCompatibility.find({ productId: { $in: productIds } }).lean(),
      categoryIds.length
        ? Category.find({ _id: { $in: categoryIds } }).select('_id categoryCode parentId').lean()
        : [],
    ]);

    const imageMap = new Map();
    images.forEach((image) => {
      const key = String(image.productId);
      const list = imageMap.get(key) || [];
      list.push(image);
      imageMap.set(key, list);
    });

    const compatMap = new Map();
    const allVehicleIds = new Set();
    compat.forEach((item) => {
      const ids = Array.isArray(item.vehicleIds) ? item.vehicleIds : [];
      compatMap.set(String(item.productId), ids.map((id) => String(id)));
      ids.forEach((id) => allVehicleIds.add(String(id)));
    });

    const vehicles = allVehicleIds.size
      ? await Vehicle.find({ _id: { $in: Array.from(allVehicleIds) } })
        .select('vehicleCode')
        .lean()
      : [];

    await ensureVehicleCodes(vehicles);

    const vehicleCodeMap = new Map(
      vehicles.map((item) => [String(item._id), item.vehicleCode || '']),
    );

    await ensureCategoryCodes(categories);

    const categoryCodeMap = new Map(
      categories.map((item) => [String(item._id), item.categoryCode || '']),
    );

    const rows = products.map((product) => {
      const productImages = imageMap.get(String(product._id)) || [];
      const primary = productImages.find((img) => img.isPrimary) || productImages[0];
      const gallery = productImages.filter((img) => !primary || String(img._id) !== String(primary._id));

      const vehicleIds = compatMap.get(String(product._id)) || [];
      const vehicleCodes = vehicleIds
        .map((id) => vehicleCodeMap.get(String(id)) || '')
        .filter(Boolean)
        .join(',');

      return {
        productCode: product.productId || '',
        name: product.name || '',
        categoryCode: categoryCodeMap.get(String(product.categoryId)) || '',
        productType: product.productType || '',
        manufacturerBrand: product.manufacturerBrand || '',
        vehicleBrand: product.vehicleBrand || '',
        oemNumber: product.oemNumber || '',
        sku: product.sku || '',
        hsnCode: product.hsnCode || '',
        shortDescription: product.shortDescription || '',
        longDescription: product.longDescription || '',
        taxClassKey: product.taxClassKey || '',
        taxRate: product.taxRate ?? '',
        stockQty: product.stockQty ?? 0,
        weight: product.weight ?? '',
        length: product.length ?? '',
        width: product.width ?? '',
        height: product.height ?? '',
        minOrderQty: product.minOrderQty ?? 1,
        minWholesaleQty: product.minWholesaleQty ?? '',
        retail_mrp: product.retailPrice?.mrp ?? '',
        retail_sale_price: product.retailPrice?.salePrice ?? '',
        wholesale_mrp: product.wholesalePrice?.mrp ?? '',
        wholesale_sale_price: product.wholesalePrice?.salePrice ?? '',
        status: product.status || '',
        vehicleCodes,
        featured_image_url: primary?.url || '',
        gallery_image_url_1: gallery[0]?.url || '',
        gallery_image_url_2: gallery[1]?.url || '',
        gallery_image_url_3: gallery[2]?.url || '',
        gallery_image_url_4: gallery[3]?.url || '',
        gallery_image_url_5: gallery[4]?.url || '',
      };
    });

    const workbook = buildWorkbook(bulkCreateHeaders, rows, 'Bulk Create');
    const isXlsx = String(format || '').toLowerCase() === 'xlsx';
    const buffer = isXlsx ? await toXlsxBuffer(workbook) : await toCsvBuffer(workbook);
    return {
      buffer,
      filename: `product_bulk_create_export.${isXlsx ? 'xlsx' : 'csv'}`,
      contentType: isXlsx
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
    };
  }
}

module.exports = new ProductBulkExportService();
module.exports.bulkCreateHeaders = bulkCreateHeaders;
module.exports.bulkUpdateHeaders = bulkUpdateHeaders;
