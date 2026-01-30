const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./notifications.service');
const audit = require('../audit/audit.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list({ user: req.user, filter: req.query });
  return success(res, data, 'Notifications fetched');
});

exports.get = asyncHandler(async (req, res) => {
  const data = await service.get(req.params.id, req.user);
  return success(res, data, 'Notification fetched');
});

exports.create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'notification_create',
    target: { id: data._id },
    meta: { userId: data.userId },
  });
  return success(res, data, 'Notification created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.user, req.body);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'notification_update',
    target: { id: req.params.id },
  });
  return success(res, data, 'Notification updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.params.id, req.user);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'notification_delete',
    target: { id: req.params.id },
  });
  return success(res, data, 'Notification deleted');
});

exports.markRead = asyncHandler(async (req, res) => {
  const data = await service.markRead(req.params.id, req.user);
  return success(res, data, 'Notification marked read');
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const data = await service.markAllRead(req.user, req.body);
  return success(res, data, 'Notifications marked read');
});

exports.summary = asyncHandler(async (req, res) => {
  const data = await service.summary(req.user);
  return success(res, data, 'Notification summary');
});
