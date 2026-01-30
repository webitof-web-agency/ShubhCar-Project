const asyncHandler = require('../../utils/asyncHandler');
const service = require('./categories.service');
const { success } = require('../../utils/apiResponse');
const {
  createCategorySchema,
  updateCategorySchema,
} = require('./categories.validator');
const validate = require('../../middlewares/validate.middleware');
const auth = require('../../middlewares/auth.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const audit = require('../audit/audit.service');

exports.getRoots = asyncHandler(async (req, res) => {
  const data = await service.getRootCategories();
  return success(res, data);
});

exports.getChildren = asyncHandler(async (req, res) => {
  const data = await service.getChildren(req.params.parentId);
  return success(res, data);
});

exports.getBySlug = asyncHandler(async (req, res) => {
  const data = await service.getBySlug(req.params.slug);
  return success(res, data);
});

exports.create = [
  adminLimiter,
  auth(['admin']),
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    const data = await service.createCategory(req.body);
    audit.log({
      actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
      action: 'category_create',
      target: { id: data._id, slug: data.slug },
    });
    return success(res, data, 'Category created', 201);
  }),
];

exports.update = [
  adminLimiter,
  auth(['admin']),
  validate(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const data = await service.updateCategory(req.params.id, req.body);
    audit.log({
      actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
      action: 'category_update',
      target: { id: req.params.id },
    });
    return success(res, data, 'Category updated');
  }),
];

exports.remove = [
  adminLimiter,
  auth(['admin']),
  asyncHandler(async (req, res) => {
    await service.deleteCategory(req.params.id);
    audit.log({
      actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
      action: 'category_delete',
      target: { id: req.params.id },
    });
    return success(res, null, 'Category deleted');
  }),
];

exports.getHierarchy = asyncHandler(async (req, res) => {
  const data = await service.getHierarchy();
  return success(res, data);
});
