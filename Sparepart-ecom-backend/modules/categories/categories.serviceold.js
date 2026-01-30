const repo = require('./category.repo');
const cache = require('../../cache/category.cache');
const productCache = require('../../cache/product.cache');
const { error } = require('../../utils/apiResponse');
const slugify = require('slugify');
const sanitize = require('../../utils/sanitizeHtml');
const cacheKeys= require('../../lib/cache/keys');

class CategoryService {
  async getRootCategories() {
    const cached = await cache.get(cache.key.roots);
    if (Array.isArray(cached)) return cached;

    const data = await repo.findRootCategories();
    await cache.set(cache.key.roots, data);
    return data;
  }
 

  async getChildren(parentId) {
    const cacheKey = cache.key.children(parentId);

   const cached = await cache.get(cacheKey);
if (Array.isArray(cached)) return cached;

    const data = await repo.findChildren(parentId);
    await cache.set(cacheKey, data);
    return data;
  }

  async getBySlug(slug) {
    const cacheKey = cache.key.slug(slug);

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const data = await repo.findBySlug(slug);
    if (data) await cache.set(cacheKey, data);

    return data;
  }

  async createCategory(payload) {
    const slug =
      payload.slug ||
      slugify(payload.name, { lower: true, strict: true, trim: true });

    const dup = await repo.findAnyBySlug(slug);
    if (dup) error('Slug already in use', 409);

    if (payload.parentId) {
      const parent = await repo.findById(payload.parentId);
      if (!parent) error('Parent category not found', 404);
    }

    const created = await repo.create({
      ...payload,
      slug,
      description: payload.description
        ? sanitize(payload.description)
        : payload.description,
    });
    
    // Targeted cache invalidation

    // Invalidate children cache of parent 
    if (created.parentId) {
      const childrenKey = cache.key.children(created.parentId);
      await cache.del(childrenKey); // Delete specific key
    } else {
    // New roots cache (if root category added)
      await cache.del(cacheKeys.catalog.categories('roots'));
    }
    
    await productCache.invalidateLists();
    return created;
  }

  async updateCategory(id, payload) {
    const existing = await repo.findById(id);
    if (!existing) error('Category not found', 404);

    if (payload.parentId) {
      if (String(payload.parentId) === String(id)) {
        error('Category cannot be its own parent', 400);
      }
      const parent = await repo.findById(payload.parentId);
      if (!parent) error('Parent category not found', 404);
    }

    if (payload.slug) {
      const dup = await repo.findAnyBySlug(payload.slug);
      if (dup && String(dup._id) !== String(id)) {
        error('Slug already in use', 409);
      }
    }

    if (payload.description) {
      payload.description = sanitize(payload.description);
    }

    const updated = await repo.updateById(id, payload);
    
    // Targeted cache invalidation
    
    // Invalidate old parent cache
    if (existing.parentId) {
      const oldParentChildrenKey = cache.key.children(existing.parentId);
      await cache.del(oldParentChildrenKey);
    } else {
      // Was a root, invalidate roots cache
      await cache.del(cacheKeys.catalog.categories('roots'));
    }
    
    // Invalidate new parent children if parent changed
    if (payload.parentId !== undefined && String(payload.parentId) !== String(existing.parentId)) {
      if (payload.parentId) {
        const newParentChildrenKey = cache.key.children(payload.parentId);
        await cache.del(newParentChildrenKey);
      } else {
        // Moved to root, invalidate roots cache
        await cache.del(cache.key.roots);
      }
    }
    
    // Invalidate slug cache if slug changed
    if (payload.slug && payload.slug !== existing.slug) {
      await cache.del(cache.key.slug(existing.slug));
    }
    
    await productCache.invalidateLists();
    return updated;
  }

  async deleteCategory(id) {
    const existing = await repo.findById(id);
    if (!existing) error('Category not found', 404);

    await repo.softDelete(id);
    
    // Targeted cache invalidation
 
    // Invalidate children cache of parent
    if (existing.parentId) {
      const parentChildrenKey = cache.key.children(existing.parentId);
      await cache.del(parentChildrenKey);
    } else {
      // Was a root category, invalidate roots cache
      await cache.del(cache.key.roots);
    }
    
    // Invalidate slug cache
    await cache.del(cache.key.slug(existing.slug));
    
    await productCache.invalidateLists();
  }

  async getHierarchy() {
    // Fetch ALL categories from MongoDB (no cache, no filters except soft delete)
    const allCategories = await repo.findAll();
    
    // Build hierarchy in memory
    const categoryMap = new Map();
    const rootCategories = [];
    
    // First pass: create map of all categories
    allCategories.forEach(cat => {
      categoryMap.set(String(cat._id), { ...cat, children: [] });
    });
    
    // Second pass: link children to parents
    allCategories.forEach(cat => {
      if (cat.parentId === null) {
        rootCategories.push(categoryMap.get(String(cat._id)));
      } else {
        const parent = categoryMap.get(String(cat.parentId));
        if (parent) {
          parent.children.push(categoryMap.get(String(cat._id)));
        }
      }
    });
    
    return rootCategories;
  }
}

module.exports = new CategoryService();
