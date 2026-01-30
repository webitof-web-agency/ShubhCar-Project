const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./analytics.controller');
const ROLES = require('../../constants/roles');
const cacheRead = require('../../middlewares/cacheRead');
const cacheKeys = require('../../lib/cache/keys');

const router = express.Router();

router.get(
  '/revenue',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.revenueSummary(req.query),
    allowAuth: true,
    ttl: 120,
  }),
  controller.revenue,
);
router.get(
  '/users',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({ key: () => cacheKeys.analytics.users(), allowAuth: true, ttl: 300 }),
  controller.users,
);
router.get(
  '/top-products',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.topProducts(req.query),
    allowAuth: true,
    ttl: 300,
  }),
  controller.topProducts,
);
router.get(
  '/inventory',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.inventory(req.query),
    allowAuth: true,
    ttl: 120,
  }),
  controller.inventory,
);
router.get(
  '/reviews',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({ key: () => cacheKeys.analytics.reviews(), allowAuth: true, ttl: 120 }),
  controller.reviews,
);
router.get(
  '/dashboard',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({ key: () => cacheKeys.analytics.dashboard(), allowAuth: true, ttl: 60 }),
  controller.dashboardStats,
);
router.get(
  '/dashboard/chart',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.revenueChart(req.query),
    allowAuth: true,
    ttl: 300,
  }),
  controller.revenueChartData,
);
router.get(
  '/sales-by-state',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.salesByState(req.query),
    allowAuth: true,
    ttl: 300,
  }),
  controller.salesByState,
);
router.get(
  '/sales-by-city',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.salesByCity(req.query),
    allowAuth: true,
    ttl: 300,
  }),
  controller.salesByCity,
);
router.get(
  '/repeat-customers',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.repeatCustomers(req.query),
    allowAuth: true,
    ttl: 300,
  }),
  controller.repeatCustomers,
);
router.get(
  '/fulfillment',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.fulfillment(req.query),
    allowAuth: true,
    ttl: 300,
  }),
  controller.fulfillment,
);
router.get(
  '/funnel',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.funnel(req.query),
    allowAuth: true,
    ttl: 300,
  }),
  controller.orderFunnel,
);
router.get(
  '/top-categories',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.topCategories(req.query),
    allowAuth: true,
    ttl: 300,
  }),
  controller.topCategories,
);
router.get(
  '/top-brands',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.topBrands(req.query),
    allowAuth: true,
    ttl: 300,
  }),
  controller.topBrands,
);
router.get(
  '/inventory-turnover',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({
    key: (req) => cacheKeys.analytics.inventoryTurnover(req.query),
    allowAuth: true,
    ttl: 300,
  }),
  controller.inventoryTurnover,
);

module.exports = router;
