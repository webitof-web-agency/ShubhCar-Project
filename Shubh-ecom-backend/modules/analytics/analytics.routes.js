const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const controller = require('./analytics.controller');
const ROLES = require('../../constants/roles');
const cacheRead = require('../../middlewares/cacheRead');
const cacheKeys = require('../../lib/cache/keys');
const { analyticsQuerySchema } = require('./analytics.validator');

const router = express.Router();
router.use(validate(analyticsQuerySchema, 'query'));

/**
 * @openapi
 * /api/v1/analytics/revenue:
 *   get:
 *     summary: Revenue summary
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: interval
 *         schema: { type: string, enum: [day, week, month] }
 *     responses:
 *       200: { description: Revenue series }
 */
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
/**
 * @openapi
 * /api/v1/analytics/users:
 *   get:
 *     summary: User metrics
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: User metrics }
 */
router.get(
  '/users',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({ key: () => cacheKeys.analytics.users(), allowAuth: true, ttl: 300 }),
  controller.users,
);
/**
 * @openapi
 * /api/v1/analytics/top-products:
 *   get:
 *     summary: Top products
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Top products }
 */
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
/**
 * @openapi
 * /api/v1/analytics/inventory:
 *   get:
 *     summary: Inventory metrics
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Inventory metrics }
 */
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
/**
 * @openapi
 * /api/v1/analytics/reviews:
 *   get:
 *     summary: Reviews analytics
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Review stats }
 */
router.get(
  '/reviews',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({ key: () => cacheKeys.analytics.reviews(), allowAuth: true, ttl: 120 }),
  controller.reviews,
);
/**
 * @openapi
 * /api/v1/analytics/dashboard:
 *   get:
 *     summary: Dashboard KPIs
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: KPI snapshot }
 */
router.get(
  '/dashboard',
  adminLimiter,
  auth([ROLES.ADMIN]),
  cacheRead({ key: () => cacheKeys.analytics.dashboard(), allowAuth: true, ttl: 60 }),
  controller.dashboardStats,
);
/**
 * @openapi
 * /api/v1/analytics/dashboard/chart:
 *   get:
 *     summary: Dashboard chart series
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Chart data }
 */
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
/**
 * @openapi
 * /api/v1/analytics/sales-by-state:
 *   get:
 *     summary: Sales by state
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Sales by state }
 */
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
/**
 * @openapi
 * /api/v1/analytics/sales-by-city:
 *   get:
 *     summary: Sales by city
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Sales by city }
 */
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
/**
 * @openapi
 * /api/v1/analytics/repeat-customers:
 *   get:
 *     summary: Repeat customer stats
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Repeat metrics }
 */
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
/**
 * @openapi
 * /api/v1/analytics/fulfillment:
 *   get:
 *     summary: Fulfillment metrics
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Fulfillment metrics }
 */
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
/**
 * @openapi
 * /api/v1/analytics/funnel:
 *   get:
 *     summary: Checkout funnel stats
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Funnel data }
 */
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
/**
 * @openapi
 * /api/v1/analytics/top-categories:
 *   get:
 *     summary: Top categories
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Top categories }
 */
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
/**
 * @openapi
 * /api/v1/analytics/top-brands:
 *   get:
 *     summary: Top brands
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Top brands }
 */
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
/**
 * @openapi
 * /api/v1/analytics/inventory-turnover:
 *   get:
 *     summary: Inventory turnover metrics
 *     tags: [Analytics]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Inventory turnover }
 */
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
