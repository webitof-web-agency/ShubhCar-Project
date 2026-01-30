const env = require('../config/env');
const taxRates = require('../constants/taxRates');
const Setting = require('../models/Setting.model');
const TaxSlab = require('../models/TaxSlab.model');

const INDIA_STATE_CODES = {
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  'assam': 'AS',
  'bihar': 'BR',
  'chhattisgarh': 'CG',
  'goa': 'GA',
  'gujarat': 'GJ',
  'haryana': 'HR',
  'himachal pradesh': 'HP',
  'jharkhand': 'JH',
  'karnataka': 'KA',
  'kerala': 'KL',
  'madhya pradesh': 'MP',
  'maharashtra': 'MH',
  'manipur': 'MN',
  'meghalaya': 'ML',
  'mizoram': 'MZ',
  'nagaland': 'NL',
  'odisha': 'OD',
  'punjab': 'PB',
  'rajasthan': 'RJ',
  'sikkim': 'SK',
  'tamil nadu': 'TN',
  'telangana': 'TS',
  'tripura': 'TR',
  'uttar pradesh': 'UP',
  'uttarakhand': 'UK',
  'west bengal': 'WB',
  'andaman and nicobar islands': 'AN',
  'chandigarh': 'CH',
  'dadra and nagar haveli and daman and diu': 'DH',
  'delhi': 'DL',
  'jammu and kashmir': 'JK',
  'ladakh': 'LA',
  'lakshadweep': 'LD',
  'puducherry': 'PY',
};

class TaxService {
  constructor() {
    this.originState = (env.GST_ORIGIN_STATE || 'KA').toUpperCase();
    this.defaultRate =
      Number(env.GST_DEFAULT_RATE || env.TAX_RATE || taxRates.defaultRate) ||
      0.18;

    this.taxRegionsCache = null;
    this.taxClassesCache = null;
  }

  normalizeCountry(countryValue) {
    if (!countryValue) return 'IN';
    const cleaned = String(countryValue).trim();
    if (!cleaned) return 'IN';
    return cleaned.length <= 3 ? cleaned.toUpperCase() : cleaned.toUpperCase();
  }

  normalizeState(stateValue) {
    if (!stateValue) return '';
    const cleaned = String(stateValue).trim();
    if (cleaned.length <= 3) return cleaned.toUpperCase();
    const key = cleaned.toLowerCase();
    return INDIA_STATE_CODES[key] || cleaned.toUpperCase();
  }

  normalizeRate(value) {
    if (value == null || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return numeric > 1 ? numeric / 100 : numeric;
  }

  parsePostalMatch(rulePostal, inputPostal) {
    if (!rulePostal || rulePostal === '*') return true;
    if (!inputPostal) return false;
    const normalizedInput = Number(String(inputPostal).replace(/\D/g, ''));
    if (!normalizedInput) return false;

    const parts = String(rulePostal)
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.some((part) => {
      if (part === '*') return true;
      const range = part.split('-').map((v) => v.trim());
      if (range.length === 2) {
        const start = Number(range[0].replace(/\D/g, ''));
        const end = Number(range[1].replace(/\D/g, ''));
        if (!start || !end) return false;
        return normalizedInput >= start && normalizedInput <= end;
      }
      const single = Number(part.replace(/\D/g, ''));
      return single && normalizedInput === single;
    });
  }

  normalizeTaxClassKey(value) {
    if (!value) return '';
    return String(value).trim().toLowerCase();
  }

  async getTaxClasses() {
    if (!this.taxClassesCache) {
      const setting = await Setting.findOne({ key: 'tax_classes' }).lean();
      const classes = Array.isArray(setting?.value) ? setting.value : [];
      this.taxClassesCache = classes;
    }
    return this.taxClassesCache;
  }

  async resolveRegion({ state, city, postalCode, countryCode, taxClassKey } = {}) {
    let regions = null;
    let classRatePercent = null;
    const classKey = this.normalizeTaxClassKey(taxClassKey);
    const classes = await this.getTaxClasses();

    if (classes.length) {
      const matched =
        classes.find((item) => this.normalizeTaxClassKey(item.key) === classKey) ||
        classes.find((item) => this.normalizeTaxClassKey(item.key) === 'standard') ||
        classes[0];
      regions = Array.isArray(matched?.regions) ? matched.regions : [];
      classRatePercent = matched?.ratePercent ?? null;
    }

    if (!regions) {
      if (!this.taxRegionsCache) {
        const setting = await Setting.findOne({ key: 'tax_regions' }).lean();
        this.taxRegionsCache = setting?.value || [];
      }
      regions = this.taxRegionsCache;
    }

    const normalizedCity = city ? String(city).toLowerCase() : null;
    const normalizedState = this.normalizeState(state);
    const normalizedCountry = this.normalizeCountry(countryCode);

    for (const region of regions) {
      if (region.status && region.status !== 'active') continue;
      const regionCountry = this.normalizeCountry(region.countryCode || region.country);
      if (regionCountry && regionCountry !== '*' && regionCountry !== normalizedCountry) continue;

      const regionState = this.normalizeState(region.stateCode || region.state);
      if (regionState && regionState !== '*' && normalizedState && regionState !== normalizedState) continue;

      const regionCity = region.city ? String(region.city).toLowerCase() : null;
      if (regionCity && regionCity !== '*' && normalizedCity && regionCity !== normalizedCity) continue;
      if (
        normalizedCity &&
        Array.isArray(region.cities) &&
        region.cities.length &&
        !region.cities.map((c) => String(c).toLowerCase()).includes(normalizedCity)
      ) {
        continue;
      }

      if (
        region.postalCode &&
        region.postalCode !== '*' &&
        !this.parsePostalMatch(region.postalCode, postalCode)
      ) {
        continue;
      }
      if (postalCode && Array.isArray(region.pincodeRanges)) {
        const matched = region.pincodeRanges.some(
          (range) =>
            Number(String(postalCode).replace(/\D/g, '')) >= Number(range.from) &&
            Number(String(postalCode).replace(/\D/g, '')) <= Number(range.to),
        );
        if (!matched) continue;
      }

      return {
        stateCode: regionState || normalizedState,
        ratePercent:
          region.ratePercent != null
            ? Number(region.ratePercent)
            : region.rate != null
              ? Number(region.rate)
              : null,
        classRatePercent,
      };
    }

    return { stateCode: normalizedState, ratePercent: null, classRatePercent };
  }

  async rateForHsn({ hsnCode, amount, productTaxSlabs, taxRate, locationRate }) {
    if (Array.isArray(productTaxSlabs) && productTaxSlabs.length) {
      const slab = productTaxSlabs.find((s) => {
        const min = Number(s.minAmount || 0);
        const max = s.maxAmount == null ? null : Number(s.maxAmount);
        return amount >= min && (max == null || amount <= max);
      });
      if (slab?.rate != null) return Number(slab.rate);
    }

    if (hsnCode) {
      const normalized = hsnCode.trim();
      const slabs = await TaxSlab.find({
        hsnCode: normalized,
        status: 'active',
      }).lean();
      if (slabs.length) {
        const matched = slabs.find((s) => {
          const min = Number(s.minAmount || 0);
          const max = s.maxAmount == null ? null : Number(s.maxAmount);
          return amount >= min && (max == null || amount <= max);
        });
        if (matched?.rate != null) return Number(matched.rate);
      }
    }

    if (taxRate != null) {
      const normalized = this.normalizeRate(taxRate);
      if (normalized != null) return normalized;
    }

    if (locationRate != null) {
      const normalized = this.normalizeRate(locationRate);
      if (normalized != null) return normalized;
    }

    const fallbackSetting = await Setting.findOne({ key: 'tax_rate' }).lean();
    if (fallbackSetting?.value != null) {
      return Number(fallbackSetting.value) / 100;
    }

    return taxRates.hsn[hsnCode] !== undefined
      ? taxRates.hsn[hsnCode]
      : this.defaultRate;
  }

  /**
   * Calculate GST breakup given a base amount and shipping state.
   * When origin and destination states match, splits into CGST/SGST.
   * Otherwise charges IGST.
   */
  async calculateGST({
    amount,
    destinationState,
    destinationCity,
    destinationPostalCode,
    destinationCountry,
    originState,
    hsnCode,
    productTaxSlabs,
    taxRate,
    taxClassKey,
    round = true,
  }) {
    const base = Math.max(0, Number(amount) || 0);
    const originSetting = await Setting.findOne({
      key: 'tax_origin_state',
    }).lean();
    const origin = this.normalizeState(
      originState || originSetting?.value || this.originState || '',
    );
    const region = await this.resolveRegion({
      state: destinationState,
      city: destinationCity,
      postalCode: destinationPostalCode,
      countryCode: destinationCountry,
      taxClassKey,
    });
    const dest = this.normalizeState(region.stateCode) || '';
    const rate = await this.rateForHsn({
      hsnCode,
      amount: base,
      productTaxSlabs,
      taxRate: taxRate != null ? taxRate : region.classRatePercent,
      locationRate:
        region.ratePercent != null ? Number(region.ratePercent) / 100 : null,
    });
    const isIntraState = origin && dest && origin === dest;
    const roundAmount = (value) =>
      round ? Math.round(value) : Number(value);

    if (isIntraState) {
      const half = base * (rate / 2);
      return {
        total: roundAmount(half * 2),
        components: {
          cgst: roundAmount(half),
          sgst: roundAmount(half),
          igst: 0,
        },
        ratePercent: rate * 100,
        mode: 'intra',
      };
    }

    const igst = roundAmount(base * rate);
    return {
      total: igst,
      components: { cgst: 0, sgst: 0, igst },
      ratePercent: rate * 100,
      mode: 'inter',
    };
  }
}

module.exports = new TaxService();
