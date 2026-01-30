const logger = require('../config/logger');

/**
 * BUSINESS METRICS LOGGER
 * 
 * Tracks key business events for analytics and monitoring
 */
class BusinessMetrics {
  /**
   * Log order lifecycle events
   */
  orderCreated(order, context = {}) {
    logger.info('business_metric:order_created', {
      type: 'business_metric',
      event: 'order_created',
      orderId: order._id,
      userId: order.userId,
      subtotal: order.subtotal,
      grandTotal: order.grandTotal,
      itemCount: order.items?.length || 0,
      paymentGateway: context.gateway,
      couponUsed: !!order.couponId,
      requestId: context.requestId,
    });
  }

  orderConfirmed(order, context = {}) {
    logger.info('business_metric:order_confirmed', {
      type: 'business_metric',
      event: 'order_confirmed',
      orderId: order._id,
      userId: order.userId,
      grandTotal: order.grandTotal,
      requestId: context.requestId,
    });
  }

  orderCancelled(order, reason, context = {}) {
    logger.info('business_metric:order_cancelled', {
      type: 'business_metric',
      event: 'order_cancelled',
      orderId: order._id,
      userId: order.userId,
      reason,
      grandTotal: order.grandTotal,
      requestId: context.requestId,
    });
  }

  /**
   * Log payment events
   */
  paymentInitiated(payment, context = {}) {
    logger.info('business_metric:payment_initiated', {
      type: 'business_metric',
      event: 'payment_initiated',
      paymentId: payment._id,
      orderId: payment.orderId,
      gateway: payment.paymentGateway,
      amount: payment.amount,
      currency: payment.currency,
      requestId: context.requestId,
    });
  }

  paymentCompleted(payment, context = {}) {
    logger.info('business_metric:payment_completed', {
      type: 'business_metric',
      event: 'payment_completed',
      paymentId: payment._id,
      orderId: payment.orderId,
      gateway: payment.paymentGateway,
      amount: payment.amount,
      transactionId: payment.transactionId,
      requestId: context.requestId,
    });
  }

  paymentFailed(payment, reason, context = {}) {
    logger.warn('business_metric:payment_failed', {
      type: 'business_metric',
      event: 'payment_failed',
      paymentId: payment._id,
      orderId: payment.orderId,
      gateway: payment.paymentGateway,
      amount: payment.amount,
      reason,
      requestId: context.requestId,
    });
  }

  /**
   * Log inventory events
   */
  inventoryReserved(productId, quantity, context = {}) {
    logger.info('business_metric:inventory_reserved', {
      type: 'business_metric',
      event: 'inventory_reserved',
      productId,
      quantity,
      orderId: context.orderId,
      userId: context.userId,
      requestId: context.requestId,
    });
  }

  inventoryCommitted(productId, quantity, context = {}) {
    logger.info('business_metric:inventory_committed', {
      type: 'business_metric',
      event: 'inventory_committed',
      productId,
      quantity,
      orderId: context.orderId,
      requestId: context.requestId,
    });
  }

  inventoryReleased(productId, quantity, reason, context = {}) {
    logger.info('business_metric:inventory_released', {
      type: 'business_metric',
      event: 'inventory_released',
      productId,
      quantity,
      reason,
      orderId: context.orderId,
      requestId: context.requestId,
    });
  }

  lowStockAlert(productId, stockQty, threshold) {
    logger.warn('business_metric:low_stock_alert', {
      type: 'business_metric',
      event: 'low_stock_alert',
      productId,
      stockQty,
      threshold,
    });
  }

  /**
   * Log authentication events
   */
  userRegistered(user, method, context = {}) {
    logger.info('business_metric:user_registered', {
      type: 'business_metric',
      event: 'user_registered',
      userId: user._id,
      method, // 'email', 'phone', 'google'
      role: user.role,
      requestId: context.requestId,
    });
  }

  userLogin(user, method, context = {}) {
    logger.info('business_metric:user_login', {
      type: 'business_metric',
      event: 'user_login',
      userId: user._id,
      method,
      role: user.role,
      requestId: context.requestId,
    });
  }

  userLogout(userId, context = {}) {
    logger.info('business_metric:user_logout', {
      type: 'business_metric',
      event: 'user_logout',
      userId,
      requestId: context.requestId,
    });
  }

  /**
   * Log reconciliation events
   */
  paymentReconciled(payment, action, context = {}) {
    logger.info('business_metric:payment_reconciled', {
      type: 'business_metric',
      event: 'payment_reconciled',
      paymentId: payment._id,
      orderId: payment.orderId,
      action, // 'confirmed', 'failed', 'manual_review'
      amount: payment.amount,
    });
  }

  /**
   * Log performance issues
   */
  slowQuery(query, durationMs, context = {}) {
    logger.warn('performance:slow_query', {
      type: 'performance',
      event: 'slow_query',
      query,
      durationMs,
      threshold: 1000,
      requestId: context.requestId,
    });
  }

  slowRequest(route, method, durationMs, context = {}) {
    logger.warn('performance:slow_request', {
      type: 'performance',
      event: 'slow_request',
      route,
      method,
      durationMs,
      threshold: 3000,
      requestId: context.requestId,
    });
  }
}

module.exports = new BusinessMetrics();
