const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./salesReports.controller');
const validateId = require('../../middlewares/objectId.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');
const {
  summaryQuerySchema,
  listSalesReportsQuerySchema,
  createSalesReportSchema,
  updateSalesReportSchema,
} = require('./salesReports.validator');

const router = express.Router();

/**
 * @openapi
 * /api/v1/sales-reports/summary:
 *   get:
 *     summary: Sales reports summary
 *     tags: [Reports]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Summary }
 */
router.get(
  '/summary',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(summaryQuerySchema, 'query'),
  controller.summary,
);

/**
 * @openapi
 * /api/v1/sales-reports:
 *   get:
 *     summary: List sales reports
 *     tags: [Reports]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Reports }
 */
router.get(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(listSalesReportsQuerySchema, 'query'),
  controller.list,
);

/**
 * @openapi
 * /api/v1/sales-reports/{id}:
 *   get:
 *     summary: Get sales report by id
 *     tags: [Reports]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Report }
 */
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.get);

/**
 * @openapi
 * /api/v1/sales-reports:
 *   post:
 *     summary: Create sales report
 *     tags: [Reports]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               range: { type: string }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               filters: { type: object }
 *             required: [range]
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validate(createSalesReportSchema),
  controller.create,
);

/**
 * @openapi
 * /api/v1/sales-reports/{id}:
 *   put:
 *     summary: Update sales report metadata
 *     tags: [Reports]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               status: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
  '/:id',
  adminLimiter,
  auth([ROLES.ADMIN]),
  validateId('id'),
  validate(updateSalesReportSchema),
  controller.update,
);

/**
 * @openapi
 * /api/v1/sales-reports/{id}:
 *   delete:
 *     summary: Delete sales report
 *     tags: [Reports]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:id', adminLimiter, auth([ROLES.ADMIN]), validateId('id'), controller.remove);

module.exports = router;
