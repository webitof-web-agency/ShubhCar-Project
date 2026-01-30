const repo = require('./notifications.repo');
const { error } = require('../../utils/apiResponse');
const notificationCache = require('../../cache/notification.cache');
const ROLES = require('../../constants/roles');

class NotificationsService {
  visibleFilter(user, filter = {}) {
    if (user.role === ROLES.ADMIN) return { ...filter };
    const or = [{ audience: 'user', userId: user.id }];
    if (user.role === ROLES.VENDOR) {
      or.push({ audience: 'vendor', userId: user.id });
    }
    return { ...filter, $or: or };
  }

  async create(payload) {
    if (!payload.userId && payload.audience !== ROLES.ADMIN) {
      error('userId required for user/vendor notifications', 400);
    }
    const created = await repo.create(payload);
    await notificationCache.clearUser(payload.userId);
    return created;
  }

  async list({ user, filter = {} }) {
    if (user.role === ROLES.ADMIN) return repo.list(filter);

    const baseFilter = this.visibleFilter(user, filter);
    // Cache only per-user scope; vendor stream shares the same cache key.
    const cacheKey = notificationCache.key.user(user.id, user.role);
    const cached = await notificationCache.get(cacheKey);
    if (cached) return cached;
    const list = await repo.list(baseFilter);
    await notificationCache.set(cacheKey, list);
    return list;
  }

  async get(id, user) {
    const notif = await repo.findById(id);
    if (!notif) error('Notification not found', 404);
    if (
      user.role !== ROLES.ADMIN &&
      String(notif.userId) !== String(user.id) &&
      !(user.role === ROLES.VENDOR && notif.audience === 'vendor')
    ) {
      error('Forbidden', 403);
    }
    return notif;
  }

  async update(id, user, payload) {
    const existing = await repo.findById(id);
    if (!existing) error('Notification not found', 404);
    if (
      user.role !== ROLES.ADMIN &&
      String(existing.userId) !== String(user.id) &&
      !(user.role === ROLES.VENDOR && existing.audience === 'vendor')
    ) {
      error('Forbidden', 403);
    }
    const updated = await repo.update(id, payload);
    await notificationCache.clearUser(existing.userId);
    return updated;
  }

  async remove(id, user) {
    const existing = await repo.findById(id);
    if (!existing) error('Notification not found', 404);
    if (user.role !== ROLES.ADMIN && String(existing.userId) !== String(user.id)) {
      error('Forbidden', 403);
    }
    await repo.remove(id);
    await notificationCache.clearUser(existing.userId);
    return { deleted: true };
  }

  async markRead(id, user) {
    const existing = await repo.findById(id);
    if (!existing) error('Notification not found', 404);
    if (
      user.role !== ROLES.ADMIN &&
      String(existing.userId) !== String(user.id) &&
      !(user.role === ROLES.VENDOR && existing.audience === 'vendor')
    ) {
      error('Forbidden', 403);
    }
    const updated = await repo.markRead(id);
    await notificationCache.clearUser(existing.userId);
    return updated;
  }

  async markAllRead(user, payload = {}) {
    const allowedAudiences =
      user.role === ROLES.ADMIN
        ? ['user', 'vendor', ROLES.ADMIN]
        : user.role === ROLES.VENDOR
        ? ['user', 'vendor']
        : ['user'];

    if (payload.audience && !allowedAudiences.includes(payload.audience)) {
      error('Forbidden', 403);
    }

    const filter = this.visibleFilter(
      user,
      payload.audience ? { audience: payload.audience } : {},
    );
    await repo.markAllRead(filter);
    await notificationCache.clearUser(user.id);
    return { updated: true };
  }

  async summary(user) {
    const filter = this.visibleFilter(user);
    const unread = await repo.countUnread(filter);
    return { unread };
  }
}

module.exports = new NotificationsService();
