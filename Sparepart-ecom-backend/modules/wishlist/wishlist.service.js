const repo = require('./wishlist.repo');
const { error } = require('../../utils/apiResponse');
const wishlistCache = require('../../cache/wishlist.cache');
const Product = require('../../models/Product.model');
const ProductImage = require('../../models/ProductImage.model');

class WishlistService {
  async list(userId) {
    const cached = await wishlistCache.get(wishlistCache.key.user(userId));
    if (cached) return cached;

    const items = await repo.findByUser(userId);
    const enriched = await this.enrichItems(items);
    await wishlistCache.set(wishlistCache.key.user(userId), enriched);
    return enriched;
  }

  async add(userId, productId) {
    const existing = await repo.findOne(userId, productId);
    if (existing) return existing;
    const created = await repo.add(userId, productId);
    await wishlistCache.clearUser(userId);
    const [enriched] = await this.enrichItems([created]);
    return enriched || created;
  }

  async remove(userId, productId) {
    const deleted = await repo.remove(userId, productId);
    if (!deleted) error('Wishlist item not found', 404);
    await wishlistCache.clearUser(userId);
    return deleted;
  }

  async enrichItems(items = []) {
    if (!items.length) return [];
    const productIds = items.map((item) => item.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const images = await ProductImage.find({ productId: { $in: productIds }, isDeleted: false })
      .sort({ isPrimary: -1, sortOrder: 1 })
      .lean();
    const imageMap = new Map();
    images.forEach((img) => {
      const key = String(img.productId);
      if (!imageMap.has(key)) {
        imageMap.set(key, []);
      }
      imageMap.get(key).push({ url: img.url, altText: img.altText });
    });

    return items.map((item) => {
      const product = productMap.get(String(item.productId));
      const productImages = product ? imageMap.get(String(product._id)) || [] : [];
      return {
        ...item,
        product: product ? { ...product, images: productImages } : null,
      };
    });
  }
}

module.exports = new WishlistService();
