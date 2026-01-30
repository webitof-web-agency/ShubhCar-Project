const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./shipment.service');
const audit = require('../audit/audit.service');
const shipmentService = require('./shipment.service');

exports.create = asyncHandler(async (req, res) => {
  const data = await service.createShipment(req.params.orderItemId, req.body);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'shipment_create',
    target: { orderItemId: req.params.orderItemId, shipmentId: data._id },
  });
  return success(res, data, 'Shipment created', 201);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const data = await service.updateShipmentStatus(
    req.params.orderItemId,
    req.body,
  );
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'shipment_update_status',
    target: { orderItemId: req.params.orderItemId },
    meta: req.body,
  });
  return success(res, data, 'Shipment updated');
});

exports.vendorList = asyncHandler(async (req, res) => {
  const data = await service.vendorList(req.user);
  return success(res, data, 'Shipments fetched');
});

exports.vendorUpdateStatus = asyncHandler(async (req, res) => {
  const data = await service.vendorUpdateStatus(
    req.user,
    req.params.orderItemId,
    req.body,
  );
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'shipment_update_status_vendor',
    target: { orderItemId: req.params.orderItemId },
    meta: req.body,
  });
  return success(res, data, 'Shipment updated');
});

exports.list = asyncHandler(async (req, res) => {
  const data = await service.list(req.query);
  return success(res, data, 'Shipments fetched');
});

exports.get = asyncHandler(async (req, res) => {
  const data = await service.get(req.params.id);
  return success(res, data, 'Shipment fetched');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.params.id);
  audit.log({
    actor: { id: req.user?.id, role: req.user?.role || 'unknown' },
    action: 'shipment_delete',
    target: { id: req.params.id },
  });
  return success(res, data, 'Shipment deleted');
});

// tracking

exports.trackByOrderItem = asyncHandler(async (req, res) => {
  const data = await service.track(req.user, req.params.orderItemId);
  return success(res, data, 'Shipment tracking fetched');
});

// calculate shipping cost
exports.calculate = asyncHandler(async (req, res) => {
  const { subtotal } = req.body;

  const shippingFee = shipmentService.calculate({ subtotal });

  return success(res, {
    subtotal,
    shippingFee,
    totalWithShipping: subtotal + shippingFee,
  });
});
exports.adminListByOrder = asyncHandler(async (req, res) => {
  const data = await shipmentService.adminListByOrder(req.params.orderId);
  return success(res, data, 'Shipments fetched');
});
