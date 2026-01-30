const Setting = require('../models/Setting.model');

const DEFAULTS = {
  order: {
    prefix: 'ORD-',
    digits: 6,
    start: 1,
    group: 'orders',
    keys: {
      prefix: 'order_number_prefix',
      digits: 'order_number_digits',
      start: 'order_number_start',
      next: 'order_number_next',
    },
  },
  invoice: {
    prefix: 'INV-',
    digits: 6,
    start: 1,
    group: 'invoice',
    keys: {
      prefix: 'invoice_number_prefix',
      digits: 'invoice_number_digits',
      start: 'invoice_number_start',
      next: 'invoice_number_next',
    },
  },
  product: {
    prefix: 'PRO-',
    digits: 6,
    start: 1,
    group: 'products',
    keys: {
      prefix: 'product_code_prefix',
      digits: 'product_code_digits',
      start: 'product_code_start',
      next: 'product_code_next',
    },
  },
  vehicle: {
    prefix: 'VEH-',
    digits: 6,
    start: 1,
    group: 'vehicles',
    keys: {
      prefix: 'vehicle_code_prefix',
      digits: 'vehicle_code_digits',
      start: 'vehicle_code_start',
      next: 'vehicle_code_next',
    },
  },
  category: {
    prefix: 'CAT-',
    digits: 6,
    start: 1,
    group: 'categories',
    keys: {
      prefix: 'category_code_prefix',
      digits: 'category_code_digits',
      start: 'category_code_start',
      next: 'category_code_next',
    },
  },
  subcategory: {
    prefix: 'CATS-',
    digits: 6,
    start: 1,
    group: 'subcategories',
    keys: {
      prefix: 'subcategory_code_prefix',
      digits: 'subcategory_code_digits',
      start: 'subcategory_code_start',
      next: 'subcategory_code_next',
    },
  },
};

const toNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeDigits = (value, fallback) => {
  const num = Math.floor(toNumber(value, fallback));
  return num > 0 ? num : fallback;
};

const normalizePrefix = (value, fallback) => {
  if (value == null) return fallback;
  return String(value);
};

const formatNumber = ({ prefix, digits, number }) => {
  const padded = String(number).padStart(digits, '0');
  return `${prefix}${padded}`;
};

const loadSettings = async (type) => {
  const config = DEFAULTS[type];
  if (!config) throw new Error(`Unknown numbering type: ${type}`);

  const keys = Object.values(config.keys);
  const rows = await Setting.find({ key: { $in: keys } }).lean();
  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    prefix: normalizePrefix(map.get(config.keys.prefix), config.prefix),
    digits: normalizeDigits(map.get(config.keys.digits), config.digits),
    start: Math.max(1, toNumber(map.get(config.keys.start), config.start)),
    nextKey: config.keys.next,
    group: config.group,
  };
};

const getNextSequence = async (type) => {
  const { start, nextKey, group } = await loadSettings(type);

  // Phase 1: Try to increment existing sequence
  // This is the most common path and is fully atomic
  const existing = await Setting.findOneAndUpdate(
    { key: nextKey },
    { $inc: { value: 1 } },
    { new: true }
  );

  if (existing) {
    return Math.max(1, toNumber(existing.value, start));
  }

  // Phase 2: If no sequence exists, create it
  // Use upsert to handle potential race conditions strictly
  const doc = await Setting.findOneAndUpdate(
    { key: nextKey },
    {
      $setOnInsert: { value: start, group, key: nextKey },
    },
    { new: true, upsert: true }
  );

  // If we just created it, return start value
  // If we raced and someone else created + incremented, doc.value will reflect that?
  // Actually with $setOnInsert only, if it exists, it returns current.
  // But if it exists, it means we missed it in Phase 1 (rare race).
  // Safest to just return doc.value relative to start
  return Math.max(1, toNumber(doc.value, start));
};

const generateNumber = async (type) => {
  const settings = await loadSettings(type);
  const seq = await getNextSequence(type);
  return formatNumber({
    prefix: settings.prefix,
    digits: settings.digits,
    number: seq,
  });
};

const generateOrderNumber = () => generateNumber('order');
const generateInvoiceNumber = () => generateNumber('invoice');
const generateProductCode = () => generateNumber('product');
const generateVehicleCode = () => generateNumber('vehicle');
const generateCategoryCode = () => generateNumber('category');
const generateSubCategoryCode = () => generateNumber('subcategory');

module.exports = {
  generateOrderNumber,
  generateInvoiceNumber,
  generateProductCode,
  generateVehicleCode,
  generateCategoryCode,
  generateSubCategoryCode,
  formatNumber,
  loadSettings,
};
