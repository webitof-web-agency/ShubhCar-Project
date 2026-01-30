const repo = require('./category.repo');
const cache = require('../../cache/category.cache');
const productCache = require('../../cache/product.cache');
const { error } = require('../../utils/apiResponse');
const slugify = require('slugify');
const sanitize = require('../../utils/sanitizeHtml');
const cacheKeys = require('../../lib/cache/keys');
const catKeys = cacheKeys.catalog.categories;
const { generateCategoryCode, generateSubCategoryCode } = require('../../utils/numbering');

const CATEGORY_CODE_REGEX = /^(CAT|CATS)-\d{6}$/;

const ensureCategoryCodes = async () => {
  const categories = await repo.findAll();
  const missing = categories.filter((item) => !item.categoryCode || !CATEGORY_CODE_REGEX.test(item.categoryCode));
  if (!missing.length) return;

  const updates = [];
  for (const category of missing) {
    const code = category.parentId
      ? await generateSubCategoryCode()
      : await generateCategoryCode();
    updates.push({
      updateOne: {
        filter: { _id: category._id },
        update: { $set: { categoryCode: code } },
      },
    });
  }

  if (updates.length) {
    await repo.bulkWrite(updates);
  }
};

class CategoryService {


  async getRootCategories() {
    await ensureCategoryCodes();
    const rootsKey = catKeys.roots();
    const cached = await cache.get(rootsKey);
    if (Array.isArray(cached)) return cached;

    // Fallback: If cache is expected but empty/invalid, checking DB is correct,
    // but ensure we cache the result.
    const data = await repo.findRootCategories();
    // Cache for 45 mins
    await cache.set(rootsKey, data);
    return data;
  }

  async getChildren(parentId) {
    await ensureCategoryCodes();
    const childrenKey = catKeys.children(parentId);

    const cached = await cache.get(childrenKey);
    if (Array.isArray(cached)) return cached;

    const data = await repo.findChildren(parentId);
    await cache.set(childrenKey, data);
    return data;
  }

  async getBySlug(slug) {
    const slugKey = catKeys.slug(slug);

    const cached = await cache.get(slugKey);
    if (cached) return cached;

    const data = await repo.findBySlug(slug);
    if (data) await cache.set(slugKey, data);

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
    await cache.del(catKeys.tree());

    if (created.parentId) {
      await this._updateChildrenCache(created.parentId, created);
    } else {
      await this._updateRootsCache(created);
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

    if (payload.parentId !== undefined && String(payload.parentId || '') !== String(existing.parentId || '')) {
      const nextCode = payload.parentId
        ? await generateSubCategoryCode()
        : await generateCategoryCode();
      payload.categoryCode = nextCode;
    }

    const updated = await repo.updateById(id, payload);
    await cache.del(catKeys.tree());

    // Handle Parent Change
    if (
      payload.parentId !== undefined &&
      String(payload.parentId) !== String(existing.parentId)
    ) {
      // Remove from old
      if (existing.parentId) {
        await this._removeFromChildrenCache(existing.parentId, id);
      } else {
        await this._removeFromRootsCache(id);
      }

      // Add to new
      if (payload.parentId) {
        await this._updateChildrenCache(payload.parentId, updated);
      } else {
        await this._updateRootsCache(updated);
      }
    } else {
      // No parent change -> just update in place
      if (updated.parentId) {
        await this._updateChildrenCache(updated.parentId, updated);
      } else {
        await this._updateRootsCache(updated);
      }
    }

    if (payload.slug && payload.slug !== existing.slug) {
      await cache.del(catKeys.slug(existing.slug));
    }

    await productCache.invalidateLists();
    return updated;
  }

  async deleteCategory(id) {
    const existing = await repo.findById(id);
    if (!existing) error('Category not found', 404);

    await cache.del(catKeys.tree());

    await repo.softDelete(id);

    if (existing.parentId) {
      await this._removeFromChildrenCache(existing.parentId, id);
    } else {
      await this._removeFromRootsCache(id);
    }

    await cache.del(catKeys.slug(existing.slug));
    await productCache.invalidateLists();
  }

  async getHierarchy() {
    await ensureCategoryCodes();
    const allCategories = await repo.findAll();

    const categoryMap = new Map();
    const rootCategories = [];

    allCategories.forEach(cat => {
      categoryMap.set(String(cat._id), { ...cat, children: [] });
    });

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
  
  async _updateRootsCache(category) {
    const key = catKeys.roots();
    let roots = await cache.get(key);
    
    // If cache miss, ignore. Next fetch will populate.
    if (!Array.isArray(roots)) return;

    // Check if exists
    const index = roots.findIndex(c => String(c._id) === String(category._id));
    if (index > -1) {
      roots[index] = category;
    } else {
      roots.push(category);
    }

    // Sort by name
    roots.sort((a, b) => a.name.localeCompare(b.name));

    await cache.set(key, roots);
  }

  async _updateChildrenCache(parentId, category) {
    const key = catKeys.children(parentId);
    let children = await cache.get(key);
    
    if (!Array.isArray(children)) return;

    const index = children.findIndex(c => String(c._id) === String(category._id));
    if (index > -1) {
      children[index] = category;
    } else {
      children.push(category);
    }

    children.sort((a, b) => a.name.localeCompare(b.name));

    await cache.set(key, children);
  }

  async _removeFromRootsCache(categoryId) {
    const key = catKeys.roots();
    let roots = await cache.get(key);
    if (!Array.isArray(roots)) return;

    const newRoots = roots.filter(c => String(c._id) !== String(categoryId));
    if (newRoots.length !== roots.length) {
      await cache.set(key, newRoots);
    }
  }

  async _removeFromChildrenCache(parentId, categoryId) {
    const key = catKeys.children(parentId);
    let children = await cache.get(key);
    if (!Array.isArray(children)) return;

    const newChildren = children.filter(c => String(c._id) !== String(categoryId));
    if (newChildren.length !== children.length) {
      await cache.set(key, newChildren);
    }
  }
}

module.exports = new CategoryService();
