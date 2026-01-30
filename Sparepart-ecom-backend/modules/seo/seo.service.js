const seoRepo = require('./seo.repo');
const { error } = require('../../utils/apiResponse');
const ROLES = require('../../constants/roles');

class SeoService {
  /* =======================
     ADMIN CMS
  ======================== */

  async upsertSeo(payload, user) {
    if (!user || user.role !== ROLES.ADMIN) error('Forbidden', 403);

    const required = ['entityType', 'metaTitle', 'metaDescription'];
    required.forEach((f) => {
      if (!payload[f]) error(`${f} is required`, 400);
    });

    if (payload.entityType !== 'global' && !payload.entityId) {
      error('entityId required for non-global SEO', 400);
    }

    return seoRepo.upsert(
      {
        entityType: payload.entityType,
        entityId: payload.entityId || null,
      },
      {
        ...payload,
        createdBy: user._id,
        isActive: true,
      },
    );
  }

  async listSeo() {
    return seoRepo.list({ isActive: true });
  }

  async deactivateSeo(id, user) {
    if (!user || user.role !== ROLES.ADMIN) error('Forbidden', 403);
    return seoRepo.deactivate(id);
  }

  /* =======================
     RUNTIME SEO RESOLUTION
     (Used by frontend / SSR)
  ======================== */

  async resolveSeo({ entityType, entityId }) {
    // 1. Try entity-specific SEO
    if (entityType && entityId) {
      const specific = await seoRepo.findOne({
        entityType,
        entityId,
        isActive: true,
      });
      if (specific) return specific;
    }

    // 2. Fallback to global SEO
    const globalSeo = await seoRepo.findOne({
      entityType: 'global',
      isActive: true,
    });

    if (!globalSeo) {
      error('Global SEO not configured', 500);
    }

    return globalSeo;
  }
}

module.exports = new SeoService();
