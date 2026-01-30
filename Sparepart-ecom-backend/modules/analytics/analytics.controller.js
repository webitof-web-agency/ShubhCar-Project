const asyncHandler = require('../../utils/asyncHandler');
const analyticsService = require('./analytics.service');
const { success } = require('../../utils/apiResponse');

exports.revenue = asyncHandler(async (req, res) => {
  const data = await analyticsService.revenueSummary(req.query);
  return success(res, data);
});

exports.users = asyncHandler(async (req, res) => {
  const data = await analyticsService.userSummary();
  return success(res, data);
});

exports.topProducts = asyncHandler(async (req, res) => {
  const data = await analyticsService.topProducts(req.query);
  return success(res, data);
});

exports.inventory = asyncHandler(async (req, res) => {
  const data = await analyticsService.lowStock(req.query);
  return success(res, data);
});

exports.reviews = asyncHandler(async (req, res) => {
  const data = await analyticsService.reviewSummary();
  return success(res, data);
});

exports.dashboardStats = asyncHandler(async (req, res) => {
  const data = await analyticsService.dashboardStats();
  return success(res, data);
});

exports.revenueChartData = asyncHandler(async (req, res) => {
  const data = await analyticsService.revenueChartData(req.query);
  return success(res, data);
});

exports.salesByState = asyncHandler(async (req, res) => {
  const data = await analyticsService.salesByState(req.query);
  return success(res, data);
});

exports.repeatCustomers = asyncHandler(async (req, res) => {
  const data = await analyticsService.repeatCustomerSummary(req.query);
  return success(res, data);
});

exports.fulfillment = asyncHandler(async (req, res) => {
  const data = await analyticsService.fulfillmentSummary(req.query);
  return success(res, data);
});

exports.orderFunnel = asyncHandler(async (req, res) => {
  const data = await analyticsService.orderFunnel(req.query);
  return success(res, data);
});

exports.topCategories = asyncHandler(async (req, res) => {
  const data = await analyticsService.topCategories(req.query);
  return success(res, data);
});

exports.topBrands = asyncHandler(async (req, res) => {
  const data = await analyticsService.topBrands(req.query);
  return success(res, data);
});

exports.inventoryTurnover = asyncHandler(async (req, res) => {
  const data = await analyticsService.inventoryTurnover(req.query);
  return success(res, data);
});

exports.salesByCity = asyncHandler(async (req, res) => {
  const data = await analyticsService.salesByCity(req.query);
  return success(res, data);
});
