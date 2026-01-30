const env = require('../config/env');
const Settings = require('../models/Settings.model');
const Setting = require('../models/Setting.model');
const ShippingRule = require('../models/ShippingRule.model');

class ShippingService {
  /**
   * Calculate shipping fee based on static MongoDB configuration.
   * Uses Settings collection with key 'shipping_config'.
   * 
   * @param {Object} params
   * @param {number} params.subtotal - Order subtotal
   * @param {Array} params.items - Order items with weight and dimensions
   * @param {Object} params.address - Shipping address
   * @returns {number} Shipping fee in INR
   */
  async calculate({ subtotal, items = [], address = {}, paymentMethod } = {}) {
    const shippingRules = await ShippingRule.find({ status: 'active' }).lean();
    const config = await Settings.findOne({ key: 'shipping_config' }).lean();
    const settings = await Setting.find({
      key: { $in: ['shipping_enabled', 'shipping_flat_rate', 'shipping_free_threshold'] },
    }).lean();
    const settingsMap = settings.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    if (settingsMap.shipping_enabled === false) {
      return 0;
    }

    const addressState = address.state
      ? String(address.state).toLowerCase()
      : null;
    const addressCity = address.city ? String(address.city).toLowerCase() : null;
    const postalCode = address.postalCode
      ? Number(String(address.postalCode).replace(/\D/g, ''))
      : null;

    const totalWeight = items.reduce((sum, item) => {
      const weight = Number(item.weight || 0);
      return sum + weight * Number(item.quantity || 1);
    }, 0);

    const volumetricWeight = items.reduce((sum, item) => {
      const length = Number(item.length || 0);
      const width = Number(item.width || 0);
      const height = Number(item.height || 0);
      const qty = Number(item.quantity || 1);
      const divisor = Number(item.volumetricDivisor || 5000);
      if (!length || !width || !height) return sum;
      const volWeight = (length * width * height) / divisor;
      return sum + volWeight * qty;
    }, 0);

    const chargeableWeight = Math.max(totalWeight, volumetricWeight);
    const isHeavy = items.some((item) => item.isHeavy);
    const isFragile = items.some((item) => item.isFragile);

    const matchRule = (rule) => {
      if (rule.states?.length && addressState) {
        const matchState = rule.states
          .map((s) => String(s).toLowerCase())
          .includes(addressState);
        if (!matchState) return false;
      }
      if (rule.cities?.length && addressCity) {
        const matchCity = rule.cities
          .map((c) => String(c).toLowerCase())
          .includes(addressCity);
        if (!matchCity) return false;
      }
      if (rule.pincodeRanges?.length && postalCode) {
        const inRange = rule.pincodeRanges.some(
          (range) =>
            postalCode >= Number(range.from) &&
            postalCode <= Number(range.to),
        );
        if (!inRange) return false;
      }
      if (rule.minWeight && chargeableWeight < Number(rule.minWeight)) {
        return false;
      }
      if (rule.maxWeight && chargeableWeight > Number(rule.maxWeight)) {
        return false;
      }
      return true;
    };

    const applicableRule = shippingRules.find(matchRule);
    if (applicableRule) {
      if (
        applicableRule.freeShippingAbove != null &&
        subtotal >= Number(applicableRule.freeShippingAbove)
      ) {
        return 0;
      }

      const base = Number(applicableRule.baseRate || 0);
      const perKg = Number(applicableRule.perKgRate || 0);
      const heavy = isHeavy ? Number(applicableRule.heavySurcharge || 0) : 0;
      const fragile = isFragile ? Number(applicableRule.fragileSurcharge || 0) : 0;
      const codFee =
        paymentMethod === 'cod' ? Number(applicableRule.codFee || 0) : 0;

      return Math.round(
        base + perKg * Math.ceil(chargeableWeight || 0) + heavy + fragile + codFee,
      );
    }

    const defaults =
      config?.value || {
        flatRate: Number(
          settingsMap.shipping_flat_rate ?? env.SHIPPING_FLAT_RATE ?? 0,
        ),
        freeShippingAbove: settingsMap.shipping_free_threshold ?? null,
      };

    if (
      defaults.freeShippingAbove != null &&
      subtotal >= Number(defaults.freeShippingAbove)
    ) {
      return 0;
    }

    return Number(defaults.flatRate || 0);
  }
}

module.exports = new ShippingService();
