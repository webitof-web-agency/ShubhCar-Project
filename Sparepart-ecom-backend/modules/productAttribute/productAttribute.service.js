const Product = require('../../models/Product.model');
const categoryRepo = require('../categories/category.repo');
const categoryAttrRepo = require('../categoryAttribute/categoryAttribute.repo');
const repo = require('./productAttribute.repo');
const { error } = require('../../utils/apiResponse');

/* =====================
   HELPERS
===================== */
function buildValuePayload(attribute, value) {
  switch (attribute.specType) {
    case 'text':
      if (typeof value !== 'string')
        error(`${attribute.name} must be text`, 400);
      return { valueText: value };

    case 'number':
      if (typeof value !== 'number')
        error(`${attribute.name} must be number`, 400);
      return { valueNumber: value };

    case 'select':
      if (!attribute.options.includes(value))
        error(`${attribute.name} invalid option`, 400);
      return { valueSelect: value };

    case 'multiselect':
      if (!Array.isArray(value)) error(`${attribute.name} must be array`, 400);
      value.forEach((v) => {
        if (!attribute.options.includes(v))
          error(`${attribute.name} invalid option`, 400);
      });
      return { valueMultiSelect: value };

    default:
      error('Invalid attribute type', 500);
  }
}

class ProductAttributeService {
  /* =====================
     LIST
  ====================== */
  async list(productId, user) {
    const product = await Product.findById(productId).lean();
    if (!product) error('Product not found', 404);

    if (
      user.role !== 'Admin' &&
      String(product.vendorId) !== String(user._id)
    ) {
      error('Forbidden', 403);
    }

    return repo.getByProduct(productId);
  }

  /* =====================
     UPSERT (CREATE / UPDATE)
  ====================== */
  async upsert(productId, attributeId, value, user) {
    const product = await Product.findById(productId).lean();
    if (!product) error('Product not found', 404);

    if (
      user.role !== 'Admin' &&
      String(product.vendorId) !== String(user._id)
    ) {
      error('Forbidden', 403);
    }

    if (product.status === 'active' && user.role === 'Vendor') {
      error('Cannot edit attributes of active product', 403);
    }

    const ancestryIds = await categoryRepo.getAncestryIds(product.categoryId);
    if (!ancestryIds.length) error('Product category not found', 404);

    const attribute = await categoryAttrRepo.findById(attributeId);
    if (!attribute) error('Attribute not found', 404);

    // ensure attribute belongs to product category tree
    const isAllowed = ancestryIds.some(
      (id) => String(id) === String(attribute.categoryId),
    );

    if (!isAllowed) {
      error('Attribute does not belong to product category tree', 400);
    }

    const valuePayload = buildValuePayload(attribute, value);

    return repo.upsert(productId, attributeId, valuePayload);
  }

  /* =====================
     DELETE
  ====================== */
  async remove(productId, attributeId, user) {
    const product = await Product.findById(productId).lean();
    if (!product) error('Product not found', 404);

    if (
      user.role !== 'Admin' &&
      String(product.vendorId) !== String(user._id)
    ) {
      error('Forbidden', 403);
    }

    if (product.status === 'active' && user.role === 'Vendor') {
      error('Cannot delete attributes of active product', 403);
    }

    return repo.remove(productId, attributeId);
  }

  /* =====================
     VALIDATION BEFORE ACTIVATE
  ====================== */
  async validateRequired(productId) {
    // Product attributes are optional; skip required enforcement.
    return true;
  }
}

module.exports = new ProductAttributeService();
