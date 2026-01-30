//products.controller.js  
const asyncHandler = require('../../utils/asyncHandler');
const productService = require('./products.service');
const productBulkUpdateService = require('./productBulkUpdate.service');
const productBulkCreateService = require('./productBulkCreate.service');
const productBulkExportService = require('./productBulkExport.service');
const { success } = require('../../utils/apiResponse');
const ROLES = require('../../constants/roles');
const audit = require('../audit/audit.service');

exports.getBySlug = asyncHandler(async (req, res) => {
  const data = await productService.getBySlug(
    req.params.slug,
    req.user || null,
  );
  return success(res, data);
});

exports.getByIdPublic = asyncHandler(async (req, res) => {
  const data = await productService.getByIdPublic(
    req.params.productId,
    req.user || null,
  );
  return success(res, data);
});

exports.getCompatibility = asyncHandler(async (req, res) => {
  const data = await productService.getCompatibility(req.params.productId);
  return success(res, data);
});

exports.getAlternatives = asyncHandler(async (req, res) => {
  const data = await productService.getAlternatives(req.params.productId);
  return success(res, data);
});

exports.listByCategory = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;

  const data = await productService.listByCategory(
    req.params.categoryId,
    { cursor, limit: Number(limit) || 20 },
    req.user || null,
  );

  return success(res, data);
});

exports.listFeatured = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;

  const data = await productService.listFeatured(
    { cursor, limit: Number(limit) || 20 },
    req.user || null,
  );

  return success(res, data);
});

exports.listPublic = asyncHandler(async (req, res) => {
  const data = await productService.listPublic(req.query, req.user || null);
  return success(res, data);
});

// ADMIN: get product by id
exports.adminGet = asyncHandler(async (req, res) => {
  const data = await productService.adminGetById(req.params.productId);
  return success(res, data, 'Product fetched');
});

exports.create = asyncHandler(async (req, res) => {
  const data = await productService.create(req.body, req.user);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'product_create',
    target: { id: data._id, slug: data.slug },
  });
  return success(res, data, 'Product created');
});

exports.update = asyncHandler(async (req, res) => {
  const data = await productService.update(
    req.params.productId,
    req.body,
    req.user,
  );
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'product_update',
    target: { id: req.params.productId },
  });
  return success(res, data, 'Product updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await productService.remove(req.params.productId, req.user);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'product_delete',
    target: { id: req.params.productId },
  });
  return success(res, data, 'Product deleted');
});

// ADMIN: list all products (including draft / inactive)

exports.adminList = asyncHandler(async (req, res) => {
  const data = await productService.adminList(req.query);

  audit.log({
    actor: { id: req.user.id, role: ROLES.ADMIN },
    action: 'product_admin_list',
  });

  return success(res, data, 'Products fetched');
});

// ADMIN: approve / publish product
exports.adminApprove = asyncHandler(async (req, res) => {
  const data = await productService.approve(req.params.productId, req.user);

  audit.log({
    actor: { id: req.user.id, role: ROLES.ADMIN },
    action: 'product_admin_approve',
    target: { id: req.params.productId },
  });

  return success(res, data, 'Product approved');
});

// ADMIN: soft delete product
exports.adminDelete = asyncHandler(async (req, res) => {
  const data = await productService.remove(req.params.productId, req.user);

  audit.log({
    actor: { id: req.user.id, role: ROLES.ADMIN },
    action: 'product_admin_delete',
    target: { id: req.params.productId },
  });

  return success(res, data, 'Product deleted');
});

// ADMIN: restore product
// ADMIN: restore
exports.adminRestore = asyncHandler(async (req, res) => {
  const data = await productService.restore(req.params.productId, req.user);

  audit.log({
    actor: { id: req.user.id, role: ROLES.ADMIN },
    action: 'product_admin_restore',
    target: { id: req.params.productId },
  });

  return success(res, data, 'Product restored');
});

// ADMIN: permanent delete
exports.adminForceDelete = asyncHandler(async (req, res) => {
  const data = await productService.permanentDelete(req.params.productId, req.user);

  audit.log({
    actor: { id: req.user.id, role: ROLES.ADMIN },
    action: 'product_admin_force_delete',
    target: { id: req.params.productId },
  });

  return success(res, data, 'Product permanently deleted');
});

// ADMIN: empty trash
exports.adminEmptyTrash = asyncHandler(async (req, res) => {
  const data = await productService.emptyTrash(req.user);

  audit.log({
    actor: { id: req.user.id, role: ROLES.ADMIN },
    action: 'product_admin_empty_trash',
  });

  return success(res, data, 'Bin emptied');
});

exports.uploadImages = asyncHandler(async (req, res) => {
  const data = await productService.addImages(
    req.params.productId,
    req.files || [],
    req.user,
  );
  return success(res, data, 'Product images uploaded', 201);
});

// ADMIN: bulk price/stock update preview
exports.adminBulkUpdatePreview = asyncHandler(async (req, res) => {
  const data = await productBulkUpdateService.preview(req.file, req.user);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'product_bulk_update_preview',
    meta: {
      fileName: req.file?.originalname,
      total: data.totalRows,
      valid: data.validRows,
      invalid: data.invalidRows,
    },
  });
  return success(res, data, 'Bulk update preview generated');
});

// ADMIN: confirm bulk update
exports.adminBulkUpdateConfirm = asyncHandler(async (req, res) => {
  const { uploadId } = req.body || {};
  const data = await productBulkUpdateService.confirm(uploadId, req.user);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'product_bulk_update_confirm',
    meta: {
      uploadId,
      jobId: data.jobId,
      total: data.total,
    },
  });
  return success(res, data, 'Bulk update queued');
});

// ADMIN: job status
exports.adminBulkUpdateStatus = asyncHandler(async (req, res) => {
  const data = await productBulkUpdateService.getJobStatus(req.params.jobId);
  return success(res, data, 'Bulk update status');
});

// ADMIN: bulk create preview
exports.adminBulkCreatePreview = asyncHandler(async (req, res) => {
  const data = await productBulkCreateService.preview(req.file, req.user);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'product_bulk_create_preview',
    meta: {
      fileName: req.file?.originalname,
      total: data.totalRows,
      valid: data.validRows,
      invalid: data.invalidRows,
    },
  });
  return success(res, data, 'Bulk create preview generated');
});

// ADMIN: confirm bulk create
exports.adminBulkCreateConfirm = asyncHandler(async (req, res) => {
  const { uploadId } = req.body || {};
  const data = await productBulkCreateService.confirm(uploadId, req.user);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'product_bulk_create_confirm',
    meta: {
      uploadId,
      jobId: data.jobId,
      total: data.total,
    },
  });
  return success(res, data, 'Bulk create queued');
});

// ADMIN: bulk create status
exports.adminBulkCreateStatus = asyncHandler(async (req, res) => {
  const data = await productBulkCreateService.getJobStatus(req.params.jobId);
  return success(res, data, 'Bulk create status');
});

// ADMIN: bulk export/template
exports.adminBulkCreateTemplate = asyncHandler(async (req, res) => {
  const data = await productBulkExportService.getBulkCreateTemplate(req.query.format);
  res.setHeader('Content-Type', data.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
  return res.send(data.buffer);
});

exports.adminBulkUpdateTemplate = asyncHandler(async (req, res) => {
  const data = await productBulkExportService.getBulkUpdateTemplate(req.query.format);
  res.setHeader('Content-Type', data.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
  return res.send(data.buffer);
});

exports.adminBulkCreateExport = asyncHandler(async (req, res) => {
  const data = await productBulkExportService.exportBulkCreate(req.query.format);
  res.setHeader('Content-Type', data.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
  return res.send(data.buffer);
});

exports.adminBulkUpdateExport = asyncHandler(async (req, res) => {
  const data = await productBulkExportService.exportBulkUpdate(req.query.format);
  res.setHeader('Content-Type', data.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
  return res.send(data.buffer);
});
