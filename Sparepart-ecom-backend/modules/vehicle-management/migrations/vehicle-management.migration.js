const Vehicle = require('../models/Vehicle.model');
const VehicleAttribute = require('../models/VehicleAttribute.model');
const VehicleAttributeValue = require('../models/VehicleAttributeValue.model');
const logger = require('../../../config/logger');

const VARIANT_NAME_KEY = 'variant name';

const normalizeVariantName = (value = '') => value.trim().toLowerCase();

const buildSignature = (ids) =>
  ids
    .map((id) => String(id))
    .sort()
    .join('|');

const migrateVariantNameAttribute = async () => {
  const attribute = await VehicleAttribute.collection.findOne({
    name: { $regex: /^variant name$/i },
  });

  if (!attribute) return { updatedVehicles: 0, removedValues: 0 };

  const values = await VehicleAttributeValue.collection
    .find({ attributeId: attribute._id })
    .toArray();
  const valueIds = values.map((value) => String(value._id));
  const valueMap = new Map(values.map((value) => [String(value._id), value.value]));

  let updatedVehicles = 0;

  if (valueIds.length) {
    const cursor = Vehicle.find({
      attributeValueIds: { $in: valueIds },
      isDeleted: false,
    }).cursor();

    for await (const vehicle of cursor) {
      const existingVariantName = String(vehicle.variantName || '').trim();
      const attributeIds = (vehicle.attributeValueIds || []).map((id) => String(id));
      const matchedValueId = attributeIds.find((id) => valueMap.has(id));
      const nextVariantName =
        existingVariantName || (matchedValueId ? valueMap.get(matchedValueId) : '');
      const nextAttributeIds = attributeIds.filter((id) => !valueMap.has(id));

      if (!nextVariantName) {
        continue;
      }

      const nextSignature = buildSignature(nextAttributeIds);
      const nextVariantNameNormalized = normalizeVariantName(nextVariantName);

      await Vehicle.collection.updateOne(
        { _id: vehicle._id },
        {
          $set: {
            variantName: nextVariantName,
            variantNameNormalized: nextVariantNameNormalized,
            attributeValueIds: nextAttributeIds,
            attributeSignature: nextSignature,
          },
        },
      );

      updatedVehicles += 1;
    }
  }

  const removedValues = await VehicleAttributeValue.collection.updateMany(
    { attributeId: attribute._id },
    { $set: { isDeleted: true, status: 'inactive' } },
  );

  await VehicleAttribute.collection.updateOne(
    { _id: attribute._id },
    { $set: { isDeleted: true, status: 'inactive' } },
  );

  const normalizeCursor = Vehicle.find({
    variantName: { $exists: true, $ne: '' },
    $or: [
      { variantNameNormalized: { $exists: false } },
      { variantNameNormalized: '' },
    ],
    isDeleted: false,
  }).cursor();

  for await (const vehicle of normalizeCursor) {
    await Vehicle.collection.updateOne(
      { _id: vehicle._id },
      { $set: { variantNameNormalized: normalizeVariantName(vehicle.variantName) } },
    );
  }

  logger.info('vehicle_variant_name_migration', {
    updatedVehicles,
    removedValues: removedValues?.modifiedCount || 0,
  });

  return {
    updatedVehicles,
    removedValues: removedValues?.modifiedCount || 0,
  };
};

module.exports = { migrateVariantNameAttribute };
