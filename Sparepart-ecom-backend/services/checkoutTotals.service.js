const Setting = require('../models/Setting.model');
const taxService = require('./tax.service');
const shippingService = require('./shipping.service');
const couponService = require('../modules/coupons/coupons.service');

const roundCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100;

const allocateRoundedComponent = (items, totalAmount, rawTotals, field) => {
  const sumRaw = rawTotals.reduce((sum, raw) => sum + raw, 0);
  if (!sumRaw || !totalAmount) {
    items.forEach((item) => {
      item[field] = 0;
    });
    return;
  }

  let allocated = 0;
  items.forEach((item, index) => {
    if (index === items.length - 1) {
      item[field] = roundCurrency(totalAmount - allocated);
      return;
    }
    const share = rawTotals[index] / sumRaw;
    const portion = roundCurrency(totalAmount * share);
    item[field] = portion;
    allocated += portion;
  });
};

const loadSettings = async (keys = []) => {
  if (!keys.length) return {};
  const settings = await Setting.find({ key: { $in: keys } }).lean();
  return settings.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
};

const buildSettingsPayload = async () => {
  const map = await loadSettings([
    'tax_enabled',
    'tax_price_display_cart',
    'tax_price_display_shop',
    'tax_price_display_suffix',
    'tax_display_totals',
    'prices_include_tax',
    'shipping_enabled',
    'shipping_free_threshold',
    'shipping_flat_rate',
  ]);

  return {
    taxEnabled: map.tax_enabled ?? true,
    taxPriceDisplayCart: map.tax_price_display_cart || 'including',
    taxPriceDisplayShop: map.tax_price_display_shop || 'including',
    taxPriceDisplaySuffix: map.tax_price_display_suffix || '',
    taxDisplayTotals: map.tax_display_totals ?? true,
    pricesIncludeTax: map.prices_include_tax ?? false,
    shippingEnabled: map.shipping_enabled ?? true,
    shippingFreeThreshold: map.shipping_free_threshold ?? null,
    shippingFlatRate: map.shipping_flat_rate ?? null,
  };
};

const buildShippingItems = (items = []) =>
  items.map((item) => ({
    quantity: item.quantity,
    weight: item.weight || 0,
    length: item.length || 0,
    width: item.width || 0,
    height: item.height || 0,
    isHeavy: Boolean(item.isHeavy),
    isFragile: Boolean(item.isFragile),
  }));

const calculateInclusiveTax = (lineTotal, rate) => {
  if (!rate) return { taxableAmount: lineTotal, taxAmount: 0 };
  const taxAmount = lineTotal - lineTotal / (1 + rate);
  const taxableAmount = lineTotal - taxAmount;
  return { taxableAmount, taxAmount };
};

const calculateTotals = async ({
  items = [],
  shippingAddress,
  paymentMethod,
  couponCode,
  userId,
} = {}) => {
  const settings = await buildSettingsPayload();

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  let discount = 0;
  let coupon = { couponId: null, couponCode: null };
  if (couponCode) {
    const preview = await couponService.preview({
      userId,
      code: couponCode,
      orderSubtotal: subtotal,
    });
    discount = preview.discountAmount || 0;
    coupon = { couponId: preview.couponId, couponCode: preview.code };
  }

  const discountRatio = subtotal > 0 ? discount / subtotal : 0;

  const rawTotals = [];
  const rawCgst = [];
  const rawSgst = [];
  const rawIgst = [];

  const calculatedItems = [];

  for (const item of items) {
    const lineSubtotal = Number(item.price || 0) * Number(item.quantity || 0);
    const lineDiscount = roundCurrency(lineSubtotal * discountRatio);
    const lineTotal = Math.max(0, lineSubtotal - lineDiscount);

    let taxableAmount = lineTotal;
    let taxAmount = 0;
    let taxPercent = 0;
    let taxMode = null;
    let rawTaxTotal = 0;
    let rawComponents = { cgst: 0, sgst: 0, igst: 0 };

    if (settings.taxEnabled) {
      const tax = await taxService.calculateGST({
        amount: lineTotal,
        destinationState: shippingAddress?.state,
        destinationCity: shippingAddress?.city,
        destinationPostalCode: shippingAddress?.postalCode,
        destinationCountry: shippingAddress?.country,
        hsnCode: item.hsnCode,
        productTaxSlabs: item.taxSlabs,
        taxRate: item.taxRate,
        taxClassKey: item.taxClassKey,
        round: false,
      });

      const rate = Number(tax.ratePercent || 0) / 100;
      taxPercent = tax.ratePercent || 0;
      taxMode = tax.mode || null;

      if (settings.pricesIncludeTax && rate > 0) {
        const inclusive = calculateInclusiveTax(lineTotal, rate);
        taxableAmount = inclusive.taxableAmount;
        taxAmount = inclusive.taxAmount;

        const taxExclusive = lineTotal * rate;
        const scale = taxExclusive ? taxAmount / taxExclusive : 0;
        rawTaxTotal = taxExclusive * scale;
        rawComponents = {
          cgst: (tax.components?.cgst || 0) * scale,
          sgst: (tax.components?.sgst || 0) * scale,
          igst: (tax.components?.igst || 0) * scale,
        };
      } else {
        taxableAmount = lineTotal;
        taxAmount = tax.total || 0;
        rawTaxTotal = tax.total || 0;
        rawComponents = tax.components || { cgst: 0, sgst: 0, igst: 0 };
      }
    }

    rawTotals.push(rawTaxTotal || 0);
    rawCgst.push(rawComponents.cgst || 0);
    rawSgst.push(rawComponents.sgst || 0);
    rawIgst.push(rawComponents.igst || 0);

    calculatedItems.push({
      ...item,
      discount: lineDiscount,
      taxableAmount,
      taxPercent,
      taxMode,
      taxComponents: { cgst: 0, sgst: 0, igst: 0 },
      taxAmount: 0,
      total: roundCurrency(taxableAmount + taxAmount),
    });
  }

  const totalRawTax = rawTotals.reduce((sum, val) => sum + val, 0);
  const taxAmountTotal = roundCurrency(totalRawTax);

  const totalRawCgst = rawCgst.reduce((sum, val) => sum + val, 0);
  const totalRawSgst = rawSgst.reduce((sum, val) => sum + val, 0);
  const totalRawIgst = rawIgst.reduce((sum, val) => sum + val, 0);

  let taxBreakdown = { cgst: 0, sgst: 0, igst: 0 };
  if (totalRawIgst > 0) {
    taxBreakdown = { cgst: 0, sgst: 0, igst: taxAmountTotal };
  } else {
    const cgstRounded = roundCurrency(totalRawCgst);
    let sgstRounded = roundCurrency(totalRawSgst);
    const diff = roundCurrency(taxAmountTotal - (cgstRounded + sgstRounded));
    sgstRounded = roundCurrency(sgstRounded + diff);
    taxBreakdown = { cgst: cgstRounded, sgst: sgstRounded, igst: 0 };
  }

  allocateRoundedComponent(calculatedItems, taxBreakdown.cgst, rawCgst, 'cgstComponent');
  allocateRoundedComponent(calculatedItems, taxBreakdown.sgst, rawSgst, 'sgstComponent');
  allocateRoundedComponent(calculatedItems, taxBreakdown.igst, rawIgst, 'igstComponent');

  calculatedItems.forEach((item) => {
    const cgst = item.cgstComponent || 0;
    const sgst = item.sgstComponent || 0;
    const igst = item.igstComponent || 0;
    item.taxComponents = { cgst, sgst, igst };
    item.taxAmount = roundCurrency(cgst + sgst + igst);
    item.total = roundCurrency(item.taxableAmount + item.taxAmount);
    delete item.cgstComponent;
    delete item.sgstComponent;
    delete item.igstComponent;
  });

  const totalTaxableAmount = calculatedItems.reduce((sum, item) => sum + item.taxableAmount, 0);

  // Recalculate subtotal for display if needed, but 'taxableAmount' should be the tax base.
  // We'll return 'taxableAmount' as the sum of all item taxable amounts (Net Total).

  const shippingItems = buildShippingItems(items);
  const shippingSubtotal = shippingItems.length
    ? items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
    : 0;

  const shippingFee = settings.shippingEnabled
    ? await shippingService.calculate({
      subtotal: shippingSubtotal,
      items: shippingItems,
      address: shippingAddress || {},
      paymentMethod,
    })
    : 0;

  const grandTotal = roundCurrency(totalTaxableAmount + taxAmountTotal + shippingFee);

  return {
    settings,
    subtotal: roundCurrency(subtotal), // Original subtotal (could be incl or excl)
    discountAmount: roundCurrency(discount),
    coupon,
    taxAmount: taxAmountTotal,
    taxBreakdown,
    shippingFee: roundCurrency(shippingFee),
    grandTotal,
    taxableAmount: roundCurrency(totalTaxableAmount), // Real Net Total
    items: calculatedItems,
  };
};

module.exports = {
  calculateTotals,
  buildSettingsPayload,
};
