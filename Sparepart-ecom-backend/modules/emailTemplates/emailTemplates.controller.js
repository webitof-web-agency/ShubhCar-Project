const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./emailTemplates.service');
const audit = require('../audit/audit.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list(req.query);
  return success(res, data, 'Email templates fetched');
});

exports.get = asyncHandler(async (req, res) => {
  const data = await service.get(req.params.id);
  return success(res, data, 'Email template fetched');
});

exports.create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'email_template_create',
    target: { id: data._id },
  });
  return success(res, data, 'Email template created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'email_template_update',
    target: { id: req.params.id },
  });
  return success(res, data, 'Email template updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.params.id);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'email_template_delete',
    target: { id: req.params.id },
  });
  return success(res, data, 'Email template deleted');
});
