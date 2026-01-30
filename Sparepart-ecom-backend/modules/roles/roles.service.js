const rolesRepo = require('./roles.repo');
const { error } = require('../../utils/apiResponse');

const DEFAULT_ROLES = [
  {
    name: 'Shop Manager',
    slug: 'shop-manager',
    permissions: [
      'dashboard.view',
      'analytics.view',
      'orders.view',
      'orders.create',
      'orders.update',
      'orders.delete',
      'products.view',
      'products.create',
      'products.update',
      'products.delete',
      'customers.view',
      'customers.update',
      'inventory.view',
      'inventory.update',
      'reviews.view',
      'reviews.update',
      'media.view',
      'media.create',
      'entries.view',
      'coupons.view',
    ],
    isSystem: true,
  },
  {
    name: 'Staff',
    slug: 'staff',
    permissions: [
      'dashboard.view',
      'orders.view',
      'products.view',
      'customers.view',
      'reviews.view',
      'media.view',
    ],
    isSystem: true,
  },
];

const normalizeSlug = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

class RolesService {
  async ensureDefaults() {
    const existing = await rolesRepo.list();
    const existingSlugs = new Set(existing.map((role) => role.slug));

    const missing = DEFAULT_ROLES.filter((role) => !existingSlugs.has(role.slug));
    if (!missing.length) return;

    await Promise.all(missing.map((role) => rolesRepo.create(role)));
  }

  async list() {
    await this.ensureDefaults();
    return rolesRepo.list();
  }

  async get(id) {
    const role = await rolesRepo.findById(id);
    if (!role) error('Role not found', 404);
    return role;
  }

  async create(payload) {
    if (!payload?.name) error('Role name is required', 400);
    const slug = normalizeSlug(payload.slug || payload.name);
    if (!slug) error('Role slug is invalid', 400);

    const existingByName = await rolesRepo.findByName(payload.name);
    if (existingByName) error('Role name already exists', 409);

    const existingBySlug = await rolesRepo.findBySlug(slug);
    if (existingBySlug) error('Role slug already exists', 409);

    return rolesRepo.create({
      name: payload.name,
      slug,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
      isSystem: false,
    });
  }

  async update(id, payload) {
    const role = await rolesRepo.findById(id);
    if (!role) error('Role not found', 404);
    if (role.isSystem) error('System roles cannot be edited', 400);

    const updateData = {};
    if (payload.name) {
      updateData.name = payload.name;
      updateData.slug = normalizeSlug(payload.slug || payload.name);
    }
    if (payload.permissions) {
      updateData.permissions = Array.isArray(payload.permissions)
        ? payload.permissions
        : [];
    }

    if (updateData.slug) {
      const existingBySlug = await rolesRepo.findBySlug(updateData.slug);
      if (existingBySlug && String(existingBySlug._id) !== String(id)) {
        error('Role slug already exists', 409);
      }
    }

    return rolesRepo.updateById(id, updateData);
  }

  async remove(id) {
    const role = await rolesRepo.findById(id);
    if (!role) error('Role not found', 404);
    if (role.isSystem) error('System roles cannot be deleted', 400);

    await rolesRepo.deleteById(id);
    return { success: true };
  }
}

module.exports = new RolesService();
