const Product = require('../../models/Product.model');

class ProductRepository {
  findById(id) {
    return Product.findById(id).lean();
  }

  // IMPORTANT: for uniqueness check, do NOT filter by status
  findAnyBySlug(slug) {
    return Product.findOne({ slug }).lean();
  }

  findBySlugActive(slug) {
    return Product.findOne({ slug, status: 'active' }).lean();
  }

  findByIdActive(id) {
    return Product.findOne({ _id: id, status: 'active' }).lean();
  }

  listByCategory(categoryId, { limit = 20, cursor }) {
    const query = { categoryId, status: 'active' };
    if (cursor) query._id = { $lt: cursor };
    return Product.find(query).sort({ _id: -1 }).limit(limit).lean();
  }

  listFeatured({ limit = 20, cursor }) {
    const query = { isFeatured: true, status: 'active' };
    if (cursor) query._id = { $lt: cursor };
    return Product.find(query).sort({ _id: -1 }).limit(limit).lean();
  }

  async listPublic({
    page = 1,
    limit = 20,
    search,
    categoryId,
    manufacturerBrand,
    productType,
    minPrice,
    maxPrice,
    sort = 'created_desc',
  }) {
    const filter = { status: 'active' };
    if (categoryId) filter.categoryId = categoryId;
    if (manufacturerBrand) filter.manufacturerBrand = manufacturerBrand;
    if (productType) {
      const types = String(productType)
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
        .map((t) => (t === 'AFTERMARKET' ? 'AFTERMARKET' : 'OEM'));
      if (types.length) filter.productType = { $in: types };
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { manufacturerBrand: { $regex: search, $options: 'i' } },
        { vehicleBrand: { $regex: search, $options: 'i' } },
        { oemNumber: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }
    if (minPrice != null || maxPrice != null) {
      const min = minPrice != null ? Number(minPrice) : 0;
      const max = maxPrice != null ? Number(maxPrice) : null;
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          {
            'retailPrice.salePrice': {
              $gte: min,
              ...(max != null ? { $lte: max } : {}),
            },
          },
          {
            'retailPrice.mrp': {
              $gte: min,
              ...(max != null ? { $lte: max } : {}),
            },
          },
        ],
      });
    }

    const sortMap = {
      created_desc: { createdAt: -1 },
      created_asc: { createdAt: 1 },
      price_asc: { 'retailPrice.mrp': 1 },
      price_desc: { 'retailPrice.mrp': -1 },
    };

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(sortMap[sort] || sortMap.created_desc)
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return { items, total };
  }

  create(data) {
    return Product.create(data);
  }

  updateById(id, data, options = {}) {
    return Product.findByIdAndUpdate(id, data, { new: true })
      .setOptions(options)
      .lean();
  }

  countByVendor(vendorId) {
    return Product.countDocuments({ vendorId, isDeleted: false });
  }
  async adminList({ filter = {}, limit = 20, page = 1, includeDeleted = false, projection = null }) {
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select(projection || undefined)
        .setOptions({ includeDeleted })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      Product.countDocuments(filter).setOptions({ includeDeleted }),
    ]);
    return { products, total };
  }

  async getStatusCounts() {
    const [active, draft, trashed] = await Promise.all([
      Product.countDocuments({ status: 'active', isDeleted: false }),
      Product.countDocuments({ status: 'draft', isDeleted: false }),
      Product.countDocuments({ isDeleted: true }).setOptions({ includeDeleted: true }),
    ]);
    return {
      all: active + draft,
      active,
      draft,
      trashed,
    };
  }
  forceDelete(id) {
    return Product.findByIdAndDelete(id).setOptions({ includeDeleted: true }).lean();
  }

  removeAllTrashed() {
    return Product.deleteMany({ isDeleted: true }).setOptions({ includeDeleted: true });
  }
}

module.exports = new ProductRepository();
