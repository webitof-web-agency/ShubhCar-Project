const bodyParser = require('body-parser');
const { webhookRateLimiter } = require('../config/rateLimiter');

/**
 * API ROUTE REGISTRY
 * ------------------
 * This is the ONLY place where routes are mounted.
 * No module is allowed to self-register routes.
 */

module.exports = function registerRoutes(app) {
  /* =====================================================
     HEALTH
  ===================================================== */
  app.get('/health', (req, res) => {
    return res.ok({
      status: 'UP',
      timestamp: new Date().toISOString(),
    });
  });

  /* =====================================================
     WEBHOOKS (EXPLICIT EXCEPTION)
     - No auth
     - No Joi
     - Gateway-specific body parsing
  ===================================================== */

  // STRIPE (RAW BODY REQUIRED)
  app.post(
    '/v1/payments/webhook/stripe',
    webhookRateLimiter,
    bodyParser.raw({ type: 'application/json' }),
    require('../modules/payments/webhook.routes').stripe,
  );

  // RAZORPAY (JSON BODY)
  app.post(
    '/v1/payments/webhook/razorpay',
    webhookRateLimiter,
    bodyParser.json(),
    require('../modules/payments/webhook.routes').razorpay,
  );

  /* =====================================================
     AUTH & USERS
  ===================================================== */
  app.use('/v1/auth', require('../modules/auth/auth.routes'));
  app.use('/v1/users', require('../modules/users/users.routes'));
  app.use(
    '/v1/user-addresses',
    require('../modules/userAddresses/userAddresses.routes'),
  );

  /* =====================================================
     ADMIN / CMS
  ===================================================== */
  app.use('/v1/admin', require('../modules/admin/admin.routes'));
  app.use('/v1/analytics', require('../modules/analytics/analytics.routes'));
  app.use('/v1/settings', require('../modules/settings/settings.routes'));
  app.use('/v1/roles', require('../modules/roles/roles.routes'));
  app.use('/v1/media', require('../modules/media/media.routes'));
  app.use('/v1/pages', require('../modules/pages/page.routes'));
  app.use(
    '/v1/email-templates',
    require('../modules/emailTemplates/emailTemplates.routes'),
  );
  app.use(
    '/v1/user-activity-logs',
    require('../modules/userActivityLogs/userActivityLogs.routes'),
  );

  /* =====================================================
     CATALOG
  ===================================================== */
  app.use('/v1/categories', require('../modules/categories/categories.routes'));
  app.use(
    '/v1/category-attributes',
    require('../modules/categoryAttribute/categoryAttribute.routes'),
  );
  app.use('/v1/products', require('../modules/products/products.routes'));
  app.use('/v1/product', require('../modules/products/products.routes'));
  app.use('/v1/brands', require('../modules/brands/brands.routes'));
  app.use('/v1/models', require('../modules/models/models.routes'));
  require('../modules/vehicle-management').registerVehicleManagementRoutes(app);
  app.use('/v1/tags', require('../modules/tags/tags.routes'));
  app.use(
    '/v1/product-attributes',
    require('../modules/productAttribute/productAttribute.routes'),
  );
  app.use(
    '/v1/product-attribute-values',
    require('../modules/productAttributeValues/productAttributeValues.routes'),
  );
  app.use(
    '/v1/product-images',
    require('../modules/productImages/productImages.routes'),
  );

  /* =====================================================
     INVENTORY
  ===================================================== */
  app.use('/v1/inventory', require('../modules/inventory/inventory.routes'));
  app.use(
    '/v1/inventory-logs',
    require('../modules/inventoryLogs/inventoryLogs.routes'),
  );
  app.use('/v1/reviews', require('../modules/reviews/reviews.routes'));
  app.use('/v1/wishlist', require('../modules/wishlist/wishlist.routes'));
  app.use(
    '/v1/product-compatibility',
    require('../modules/productCompatibility/productCompatibility.routes'),
  );

  /* =====================================================
     CART & ORDERS
  ===================================================== */
  app.use('/v1/cart', require('../modules/cart/cart.routes'));
  app.use('/v1/orders', require('../modules/orders/orders.routes'));
  app.use(
    '/v1/order-items',
    require('../modules/orderItems/orderItems.routes'),
  );
  app.use('/v1/shipments', require('../modules/shipments/shipment.routes'));
  app.use('/v1/returns', require('../modules/returns/return.routes'));
  app.use('/v1/invoices', require('../modules/invoice/invoice.routes'));
  app.use('/v1/shipping-rules', require('../modules/shippingRules/shippingRules.routes'));
  app.use('/v1/tax', require('../modules/tax/tax.routes'));

  /* =====================================================
     PAYMENTS (NON-WEBHOOK)
  ===================================================== */
  app.use('/v1/payments', require('../modules/payments/payments.routes'));

  /* =====================================================
     PROMOTIONS & REPORTS
  ===================================================== */
  app.use('/v1/coupons', require('../modules/coupons/coupons.routes'));
  app.use(
    '/v1/sales-reports',
    require('../modules/salesReports/salesReports.routes'),
  );

  /* =====================================================
     NOTIFICATIONS & ENTRIES
  ===================================================== */
  app.use(
    '/v1/notifications',
    require('../modules/notifications/notifications.routes'),
  );
  app.use('/v1/entries', require('../modules/entries/entries.routes'));

  /* =====================================================
     FALLBACK (404)
  ===================================================== */
  app.use((req, res) => {
    return res.fail('API route not found', 404, 'ROUTE_NOT_FOUND');
  });
};
