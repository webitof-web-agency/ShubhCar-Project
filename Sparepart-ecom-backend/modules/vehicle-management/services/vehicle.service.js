const repo = require('../repositories/vehicle.repository');
const ExcelJS = require('exceljs');
const { generateVehicleCode } = require('../../../utils/numbering');
const Brand = require('../../../models/Brand.model');
const VehicleModel = require('../models/VehicleModel.model');
const VehicleYear = require('../models/VehicleYear.model');
const VehicleAttributeValue = require('../models/VehicleAttributeValue.model');
const Vehicle = require('../models/Vehicle.model');
const { error } = require('../../../utils/apiResponse');

const normalizeName = (value = '') => value.trim().toLowerCase();
const normalizeVariantName = (value = '') => value.trim().toLowerCase();
const VARIANT_NAME_KEY = 'variant name';
const MAX_VARIANT_NAME_LENGTH = 100;

const buildSignature = (ids) =>
  ids
    .map((id) => String(id))
    .sort()
    .join('|');

const isVariantNameAttribute = (name) =>
  normalizeName(name) === VARIANT_NAME_KEY;

const mapAttributeValues = (attributeValues = []) => {
  const attributes = attributeValues
    .filter((item) => item?.attributeId)
    .map((item) => ({
      attributeId: item.attributeId?._id || item.attributeId,
      attributeName: item.attributeId?.name || '',
      valueId: item._id,
      value: item.value,
      status: item.status,
    }))
    .filter((item) => !isVariantNameAttribute(item.attributeName));

  const byName = {};
  attributes.forEach((attr) => {
    const key = normalizeName(attr.attributeName);
    if (key) byName[key] = attr.value;
  });

  return { attributes, byName };
};

const mapVehicle = (vehicle) => {
  const { attributes, byName } = mapAttributeValues(vehicle.attributeValueIds || []);
  return {
    _id: vehicle._id,
    vehicleCode: vehicle.vehicleCode || '',
    brandId: vehicle.brandId?._id || vehicle.brandId,
    modelId: vehicle.modelId?._id || vehicle.modelId,
    yearId: vehicle.yearId?._id || vehicle.yearId,
    variantName: vehicle.variantName || '',
    brand: vehicle.brandId || null,
    model: vehicle.modelId || null,
    year: vehicle.yearId || null,
    status: vehicle.status,
    attributes,
    display: {
      variantName: vehicle.variantName || '',
      fuelType: byName['fuel type'] || '',
      transmission: byName['transmission'] || '',
      engineCapacity: byName['engine capacity'] || '',
    },
  };
};

const VEHICLE_CODE_REGEX = /^VEH-\d{6}$/;

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

const toCsvBuffer = async (workbook) => {
  const buffer = await workbook.csv.writeBuffer();
  return Buffer.from(buffer);
};

const toXlsxBuffer = async (workbook) => {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

class VehiclesService {
  async list(query = {}) {
    const filter = { isDeleted: false };
    if (query.brandId) filter.brandId = query.brandId;
    if (query.modelId) filter.modelId = query.modelId;
    if (query.yearId) filter.yearId = query.yearId;
    if (query.status) filter.status = query.status;

    let attributeValueIds = [];
    if (query.attributeValueIds) {
      attributeValueIds = String(query.attributeValueIds)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (attributeValueIds.length) {
        filter.attributeValueIds = { $all: attributeValueIds };
      }
    }

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);

    const [items, total] = await Promise.all([
      repo
        .list(filter, { page, limit })
        .populate('brandId', 'name logo status')
        .populate('modelId', 'name image status')
        .populate('yearId', 'year status')
        .populate({
          path: 'attributeValueIds',
          select: 'value attributeId status',
          populate: { path: 'attributeId', select: 'name type status' },
        })
        .lean(),
      repo.count(filter),
    ]);

    await ensureVehicleCodes(items);

    return {
      items: items.map(mapVehicle),
      total,
      page,
      limit,
    };
  }

  async exportVehicles(format = 'csv') {
    const vehicles = await Vehicle.find({ isDeleted: false })
      .populate('brandId', 'name')
      .populate('modelId', 'name')
      .populate('yearId', 'year')
      .populate({
        path: 'attributeValueIds',
        select: 'value attributeId status',
        populate: { path: 'attributeId', select: 'name type status' },
      })
      .lean();

    await ensureVehicleCodes(vehicles);
    const mapped = vehicles.map(mapVehicle);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Vehicles');
    sheet.columns = [
      { header: 'vehicleCode', key: 'vehicleCode' },
      { header: 'brandName', key: 'brandName' },
      { header: 'modelName', key: 'modelName' },
      { header: 'year', key: 'year' },
      { header: 'variantName', key: 'variantName' },
      { header: 'status', key: 'status' },
      { header: 'attributes', key: 'attributes' },
    ];

    mapped.forEach((item) => {
      const attrText = Array.isArray(item.attributes)
        ? item.attributes
          .map((attr) => `${attr.attributeName || ''}:${attr.value}`)
          .filter((entry) => entry !== ':')
          .join(' | ')
        : '';
      sheet.addRow({
        vehicleCode: item.vehicleCode || '',
        brandName: item.brand?.name || '',
        modelName: item.model?.name || '',
        year: item.year?.year || '',
        variantName: item.variantName || '',
        status: item.status || '',
        attributes: attrText,
      });
    });

    const isXlsx = String(format || '').toLowerCase() === 'xlsx';
    const buffer = isXlsx ? await toXlsxBuffer(workbook) : await toCsvBuffer(workbook);
    return {
      buffer,
      filename: `vehicles_export.${isXlsx ? 'xlsx' : 'csv'}`,
      contentType: isXlsx
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
    };
  }

  async create(payload) {
    if (!payload.brandId) error('brandId is required', 400);
    if (!payload.modelId) error('modelId is required', 400);
    if (!payload.yearId) error('yearId is required', 400);
    if (payload.variantName === undefined || payload.variantName === null) {
      error('variantName is required', 400);
    }

    const variantName = String(payload.variantName || '').trim();
    if (!variantName) error('variantName cannot be empty', 400);
    if (variantName.length > MAX_VARIANT_NAME_LENGTH) {
      error(`variantName must be at most ${MAX_VARIANT_NAME_LENGTH} characters`, 400);
    }

    const brand = await Brand.findById(payload.brandId).lean();
    if (!brand || brand.type !== 'vehicle') error('Vehicle brand not found', 404);

    const model = await VehicleModel.findById(payload.modelId).lean();
    if (!model) error('Vehicle model not found', 404);
    if (String(model.brandId) !== String(payload.brandId)) {
      error('Model does not belong to brand', 400);
    }

    const year = await VehicleYear.findById(payload.yearId).lean();
    if (!year) error('Vehicle year not found', 404);

    const attributeValueIds = Array.isArray(payload.attributeValueIds)
      ? payload.attributeValueIds
      : [];

    const uniqueIds = [...new Set(attributeValueIds.map((id) => String(id)))];
    if (!uniqueIds.length) {
      error('attributeValueIds is required', 400);
    }
    if (uniqueIds.length !== attributeValueIds.length) {
      error('attributeValueIds contains duplicates', 400);
    }

    const attributeValues = await VehicleAttributeValue.find({
      _id: { $in: uniqueIds },
    })
      .populate('attributeId', 'name type')
      .lean();

    if (attributeValues.length !== uniqueIds.length) {
      error('One or more attributeValueIds are invalid', 400);
    }

    const hasVariantNameAttribute = attributeValues.some((value) =>
      isVariantNameAttribute(value.attributeId?.name),
    );
    if (hasVariantNameAttribute) {
      error('Variant Name cannot be sent as a variant attribute', 400);
    }

    const attributeSignature = buildSignature(uniqueIds);
    const variantNameNormalized = normalizeVariantName(variantName);
    const duplicate = await repo.findOne({
      brandId: payload.brandId,
      modelId: payload.modelId,
      yearId: payload.yearId,
      variantNameNormalized,
      attributeSignature,
    });

    if (duplicate) {
      error('Vehicle with the same variant name and attributes already exists', 409);
    }

    const vehicleCode = payload.vehicleCode
      ? String(payload.vehicleCode).trim().toUpperCase()
      : undefined;

    if (vehicleCode) {
      if (!VEHICLE_CODE_REGEX.test(vehicleCode)) {
        error('vehicleCode must be in format VEH-000001', 400);
      }
      const existingCode = await repo.findOne({ vehicleCode });
      if (existingCode) {
        error('vehicleCode already exists', 409);
      }
    }

    return repo.create({
      vehicleCode,
      brandId: payload.brandId,
      modelId: payload.modelId,
      yearId: payload.yearId,
      variantName,
      variantNameNormalized,
      attributeValueIds: uniqueIds,
      attributeSignature,
      status: payload.status || 'active',
    });
  }

  async get(id) {
    const item = await repo
      .findById(id)
      .populate('brandId', 'name logo status')
      .populate('modelId', 'name image status')
      .populate('yearId', 'year status')
      .populate({
        path: 'attributeValueIds',
        select: 'value attributeId status',
        populate: { path: 'attributeId', select: 'name type status' },
      })
      .lean();

    if (!item) error('Vehicle not found', 404);
    return mapVehicle(item);
  }

  async detail(id) {
    const vehicle = await this.get(id);
    const siblings = await Vehicle.find({ modelId: vehicle.modelId })
      .populate('brandId', 'name logo status')
      .populate('modelId', 'name image status')
      .populate('yearId', 'year status')
      .populate({
        path: 'attributeValueIds',
        select: 'value attributeId status',
        populate: { path: 'attributeId', select: 'name type status' },
      })
      .lean();

    const grouped = new Map();
    siblings.map(mapVehicle).forEach((item) => {
      const yearKey = String(item.year?.year || item.yearId);
      const entry = grouped.get(yearKey) || {
        yearId: item.yearId,
        year: item.year?.year,
        variants: [],
      };
      entry.variants.push(item);
      grouped.set(yearKey, entry);
    });

    const variantsByYear = Array.from(grouped.values()).sort(
      (a, b) => Number(b.year || 0) - Number(a.year || 0),
    );

    return {
      vehicle,
      master: {
        brand: vehicle.brand,
        model: vehicle.model,
      },
      variantsByYear,
    };
  }

  async update(id, payload) {
    const existing = await repo.findById(id).lean();
    if (!existing) error('Vehicle not found', 404);

    const updated = { ...payload };
    if (updated.vehicleCode) {
      updated.vehicleCode = String(updated.vehicleCode).trim().toUpperCase();
      if (!VEHICLE_CODE_REGEX.test(updated.vehicleCode)) {
        error('vehicleCode must be in format VEH-000001', 400);
      }
    }

    const brandId = updated.brandId || existing.brandId;
    const modelId = updated.modelId || existing.modelId;
    const yearId = updated.yearId || existing.yearId;
    const variantName =
      updated.variantName !== undefined
        ? String(updated.variantName || '').trim()
        : String(existing.variantName || '').trim();

    if (!variantName) {
      error('variantName is required', 400);
    }
    if (variantName.length > MAX_VARIANT_NAME_LENGTH) {
      error(`variantName must be at most ${MAX_VARIANT_NAME_LENGTH} characters`, 400);
    }

    if (updated.brandId || updated.modelId) {
      const brand = await Brand.findById(brandId).lean();
      if (!brand || brand.type !== 'vehicle') error('Vehicle brand not found', 404);

      const model = await VehicleModel.findById(modelId).lean();
      if (!model) error('Vehicle model not found', 404);
      if (String(model.brandId) !== String(brandId)) {
        error('Model does not belong to brand', 400);
      }
    }

    if (updated.yearId) {
      const year = await VehicleYear.findById(yearId).lean();
      if (!year) error('Vehicle year not found', 404);
    }

    let attributeValueIds = existing.attributeValueIds || [];
    if (updated.attributeValueIds) {
      attributeValueIds = Array.isArray(updated.attributeValueIds)
        ? updated.attributeValueIds
        : [];

      const uniqueIds = [...new Set(attributeValueIds.map((item) => String(item)))];
      if (!uniqueIds.length) {
        error('attributeValueIds is required', 400);
      }
      if (uniqueIds.length !== attributeValueIds.length) {
        error('attributeValueIds contains duplicates', 400);
      }

      const attributeValues = await VehicleAttributeValue.find({
        _id: { $in: uniqueIds },
      })
        .populate('attributeId', 'name type')
        .lean();

      if (attributeValues.length !== uniqueIds.length) {
        error('One or more attributeValueIds are invalid', 400);
      }

      const hasVariantNameAttribute = attributeValues.some((value) =>
        isVariantNameAttribute(value.attributeId?.name),
      );
      if (hasVariantNameAttribute) {
        error('Variant Name cannot be sent as a variant attribute', 400);
      }

      attributeValueIds = uniqueIds;
    }

    const attributeSignature = buildSignature(
      attributeValueIds.map((item) => String(item)),
    );
    const variantNameNormalized = normalizeVariantName(variantName);

    const duplicate = await repo.findOne({
      _id: { $ne: id },
      brandId,
      modelId,
      yearId,
      variantNameNormalized,
      attributeSignature,
    });

    if (duplicate) {
      error('Vehicle with the same variant name and attributes already exists', 409);
    }

    if (updated.vehicleCode) {
      const existingCode = await repo.findOne({
        _id: { $ne: id },
        vehicleCode: updated.vehicleCode,
      });
      if (existingCode) error('vehicleCode already exists', 409);
    }

    const result = await repo.update(id, {
      ...updated,
      brandId,
      modelId,
      yearId,
      variantName,
      variantNameNormalized,
      attributeValueIds,
      attributeSignature,
    });

    if (!result) error('Vehicle not found', 404);
    return result;
  }

  async remove(id) {
    const item = await repo.softDelete(id);
    if (!item) error('Vehicle not found', 404);
    return item;
  }

  async listAvailableYears(query = {}) {
    if (!query.modelId) error('modelId is required', 400);
    const yearIds = await Vehicle.distinct('yearId', {
      modelId: query.modelId,
      isDeleted: false,
    });
    if (!yearIds.length) return [];
    return VehicleYear.find({ _id: { $in: yearIds }, status: 'active' })
      .sort({ year: -1 })
      .lean();
  }

  async listAvailableAttributes(query = {}) {
    if (!query.modelId) error('modelId is required', 400);
    const filter = { modelId: query.modelId, isDeleted: false };
    if (query.yearId) filter.yearId = query.yearId;

    const attributeValueIds = await Vehicle.distinct(
      'attributeValueIds',
      filter,
    );

    if (!attributeValueIds.length) return [];

    const values = await VehicleAttributeValue.find({
      _id: { $in: attributeValueIds },
      status: 'active',
    })
      .populate('attributeId', 'name type status')
      .lean();

    const map = new Map();
    values.forEach((value) => {
      const attribute = value.attributeId;
      if (!attribute) return;
      if (isVariantNameAttribute(attribute.name)) return;
      const key = String(attribute._id);
      const entry = map.get(key) || {
        attributeId: attribute._id,
        name: attribute.name,
        type: attribute.type,
        values: [],
      };
      entry.values.push({
        _id: value._id,
        value: value.value,
        status: value.status,
      });
      map.set(key, entry);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
}

module.exports = new VehiclesService();
