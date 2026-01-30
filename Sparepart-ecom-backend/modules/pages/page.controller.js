const asyncHandler = require('../../utils/asyncHandler');
const pageService = require('./page.service');
const { success } = require('../../utils/apiResponse');

/* =======================
   ADMIN CMS
======================= */

exports.create = asyncHandler(async (req, res) => {
  const data = await pageService.create(req.body, req.user);
  return success(res, data, 'Page created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await pageService.update(req.params.id, req.body, req.user);
  return success(res, data, 'Page updated');
});

exports.list = asyncHandler(async (req, res) => {
  const { slug, status } = req.query;
  const filters = {};
  if (slug) filters.slug = slug;
  if (status) filters.status = status;
  
  const data = await pageService.list(filters);
  return success(res, data);
});

exports.get = asyncHandler(async (req, res) => {
  const data = await pageService.get(req.params.id);
  return success(res, data);
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await pageService.remove(req.params.id, req.user);
  return success(res, data, 'Page deleted');
});

/* =======================
   PUBLIC
======================= */

exports.resolve = asyncHandler(async (req, res) => {
  const data = await pageService.resolveBySlug(req.params.slug);
  return success(res, data);
});
