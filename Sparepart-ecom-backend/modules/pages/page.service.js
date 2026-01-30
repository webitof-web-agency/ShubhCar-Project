const pageRepo = require('./page.repo');
const { error } = require('../../utils/apiResponse');
const sanitize = require('../../utils/sanitizeHtml');
const ROLES = require('../../constants/roles');
const { deletePatterns } = require('../../lib/cache/invalidate');
const keys = require('../../lib/cache/keys');

class PageService {
  /* =======================
     ADMIN CMS
  ======================== */

  async create(payload, user) {
    if (!user || user.role !== ROLES.ADMIN) error('Forbidden', 403);

    if (!payload.slug || !payload.title) {
      error('slug and title are required', 400);
    }

    // sanitize text content
    payload.sections = (payload.sections || []).map((section) => {
      // If data is a string, sanitize it
      if (typeof section.data === 'string') {
        return { ...section, data: sanitize(section.data) };
      }
      // If data is an object (like {heading, content}), sanitize string fields
      if (typeof section.data === 'object' && section.data !== null) {
        const sanitizedData = {};
        for (const [key, value] of Object.entries(section.data)) {
          sanitizedData[key] = typeof value === 'string' ? sanitize(value) : value;
        }
        return { ...section, data: sanitizedData };
      }
      // Return section as-is if data is neither string nor object
      return section;
    });

    const created = await pageRepo.create({
      ...payload,
      createdBy: user._id,
    });
    await deletePatterns([
      keys.cms.page(payload.slug),
      keys.cms.seo(payload.slug),
    ]);
    return created;
  }

  async update(id, payload, user) {
    if (!user || user.role !== ROLES.ADMIN) error('Forbidden', 403);

    if (payload.sections) {
      payload.sections = payload.sections.map((section) => {
        // If data is a string, sanitize it
        if (typeof section.data === 'string') {
          return { ...section, data: sanitize(section.data) };
        }
        // If data is an object (like {heading, content}), sanitize string fields
        if (typeof section.data === 'object' && section.data !== null) {
          const sanitizedData = {};
          for (const [key, value] of Object.entries(section.data)) {
            sanitizedData[key] = typeof value === 'string' ? sanitize(value) : value;
          }
          return { ...section, data: sanitizedData };
        }
        // Return section as-is if data is neither string nor object
        return section;
      });
    }

    if (payload.status === 'published') {
      payload.publishedAt = new Date();
    }

    const updated = await pageRepo.update(id, payload);
    await deletePatterns([
      payload.slug ? keys.cms.page(payload.slug) : null,
      payload.slug ? keys.cms.seo(payload.slug) : null,
    ].filter(Boolean));
    return updated;
  }

  async list(filters = {}) {
    return pageRepo.list(filters);
  }

  async get(id) {
    const page = await pageRepo.findById(id);
    if (!page) error('Page not found', 404);
    return page;
  }

  async remove(id, user) {
    if (!user || user.role !== ROLES.ADMIN) error('Forbidden', 403);
    const deleted = await pageRepo.delete(id);
    await deletePatterns(['cms:page:*', 'cms:seo:*']);
    return deleted;
  }

  /* =======================
     PUBLIC
  ======================== */

  async resolveBySlug(slug) {
    const page = await pageRepo.findBySlug(slug, true);
    if (!page) error('Page not found', 404);
    return page;
  }
}

module.exports = new PageService();
