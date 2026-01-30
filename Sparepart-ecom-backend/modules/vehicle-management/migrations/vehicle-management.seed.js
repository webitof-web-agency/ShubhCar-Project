const VehicleAttribute = require('../models/VehicleAttribute.model');
const VehicleAttributeValue = require('../models/VehicleAttributeValue.model');

const DEFAULT_ATTRIBUTES = [
  {
    name: 'Engine Capacity',
    type: 'dropdown',
    values: ['1.5L', '1.6L'],
  },
  {
    name: 'Engine Code',
    type: 'dropdown',
    values: ['HSAF', 'HSM3'],
  },
  {
    name: 'Fuel Type',
    type: 'dropdown',
    values: ['Petrol', 'Diesel'],
  },
  {
    name: 'Transmission',
    type: 'dropdown',
    values: ['MT', 'AT', 'AMT'],
  },
  {
    name: 'Drive Type',
    type: 'dropdown',
    values: ['2WD', 'AWD'],
  },
  {
    name: 'Emission Norm',
    type: 'dropdown',
    values: ['BS4', 'BS6'],
  },
];

const upsertAttribute = async (attribute) => {
  const existing = await VehicleAttribute.collection.findOne({
    name: attribute.name,
  });

  if (!existing) {
    const created = await VehicleAttribute.create({
      name: attribute.name,
      type: attribute.type,
      status: 'active',
    });
    return created._id;
  }

  if (existing.isDeleted) {
    await VehicleAttribute.collection.updateOne(
      { _id: existing._id },
      { $set: { isDeleted: false, status: 'active', type: attribute.type } },
    );
  }

  return existing._id;
};

const upsertValue = async (attributeId, value) => {
  const existing = await VehicleAttributeValue.collection.findOne({
    attributeId,
    value,
  });

  if (!existing) {
    await VehicleAttributeValue.create({
      attributeId,
      value,
      status: 'active',
    });
    return;
  }

  if (existing.isDeleted) {
    await VehicleAttributeValue.collection.updateOne(
      { _id: existing._id },
      { $set: { isDeleted: false, status: 'active' } },
    );
  }
};

const ensureVehicleAttributeDefaults = async () => {
  for (const attribute of DEFAULT_ATTRIBUTES) {
    const attributeId = await upsertAttribute(attribute);
    for (const value of attribute.values) {
      await upsertValue(attributeId, value);
    }
  }
};

module.exports = { ensureVehicleAttributeDefaults };
