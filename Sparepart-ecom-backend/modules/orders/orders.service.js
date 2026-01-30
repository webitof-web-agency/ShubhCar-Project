const mongoose = require('mongoose');
const cartCache = require('../cart/cart.cache');
const cartRepo = require('../cart/cart.repo');
const productRepo = require('../products/product.repo');
const orderRepo = require('./order.repo');
const addressRepo = require('../users/userAddress.repo');
const couponRepo = require('../coupons/coupon.repo');
const couponService = require('../coupons/coupons.service');
const paymentRepo = require('../payments/payment.repo');
const inventoryService = require('../inventory/inventory.service');
const orderVersionRepo = require('./orderVersion.repo');
const orderEventRepo = require('./orderEvent.repo');
const orderJobs = require('../../jobs/order.jobs');
const taxService = require('../../services/tax.service');
const shippingService = require('../../services/shipping.service');
const shipmentRepo = require('../shipments/shipment.repo');
const invoiceService = require('../invoice/invoice.service');
const orderStateMachine = require('../../utils/orderStateMachine');
const emailNotification = require('../../services/emailNotification.service');
const pricingService = require('../../services/pricing.service');
const checkoutTotals = require('../../services/checkoutTotals.service');
const businessMetrics = require('../../utils/businessMetrics');
const logger = require('../../config/logger');
const UserAddress = require('../../models/UserAddress.model');
const Order = require('../../models/Order.model');
const OrderItem = require('../../models/OrderItem.model');
const ProductImage = require('../../models/ProductImage.model');
const userRepo = require('../users/user.repo');
const { getPaymentSettings } = require('../../utils/paymentSettings');
const { placeOrderSchema } = require('./order.validator');
const {
  cancelOrderSchema,
  adminStatusUpdateSchema,
} = require('./orderStatus.validator');
const { ORDER_STATUS } = require('../../constants/orderStatus');
const {
  PAYMENT_STATUS,
  PAYMENT_RECORD_STATUS,
} = require('../../constants/paymentStatus');
const {
  getPaymentSummary,
  attachPaymentSummary,
  derivePaymentStatus,
} = require('./paymentSummary');
const { error } = require('../../utils/apiResponse');
const ROLES = require('../../constants/roles'); 
const { generateOrderNumber } = require('../../utils/numbering');

const roundCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100;

const assertPaymentMethodEnabled = async (paymentMethod, gateway) => {
  const settings = await getPaymentSettings();
  if (paymentMethod === 'cod' && !settings.codEnabled) {
    error('Cash on delivery is disabled', 409);
  }
  if (paymentMethod === 'razorpay') {
    if (!settings.razorpayEnabled) error('Razorpay is disabled', 409);
    if (!settings.razorpayKeyId || !settings.razorpayKeySecret) {
      error('Razorpay credentials are missing', 500);
    }
    if (gateway && gateway !== 'razorpay') {
      error('Unsupported payment gateway', 400);
    }
  }
  if (!['cod', 'razorpay'].includes(paymentMethod)) {
    error('Unsupported payment method', 400);
  }
};

const allocateRoundedComponent = (items, totalAmount, rawTotals, field) => {
  const sumRaw = rawTotals.reduce((sum, raw) => sum + raw, 0);
  if (!sumRaw || !totalAmount) {
    items.forEach((item) => {
      item[field] = 0;
    });
    return;
  }

  let allocated = 0;
  items.forEach((item, index) => {
    if (index === items.length - 1) {
      item[field] = roundCurrency(totalAmount - allocated);
      return;
    }
    const share = rawTotals[index] / sumRaw;
    const portion = roundCurrency(totalAmount * share);
    item[field] = portion;
    allocated += portion;
  });
};

function assertOrderIsPaid(order) {
  if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
    error(
      'Order cannot proceed to shipment without successful payment',
      409,
      'PAYMENT_REQUIRED',
    );
  }
}

class OrderService {
  async placeOrder({ user, sessionId, payload, context = {} }) {
    const log = logger.withContext({
      requestId: context.requestId || null,
      route: context.route,
      method: context.method,
      userId: context.userId || user?.id || null,
    });
    const cart = await cartRepo.getOrCreateCart({ userId: user.id, sessionId });
    const cartItems = await cartRepo.getCartWithItems(cart._id);
    if (!cartItems.length) error('Cart is empty', 400);

    await assertPaymentMethodEnabled(payload.paymentMethod, payload.gateway);

    const [shippingAddress, billingAddress] = await Promise.all([
      addressRepo.findById(payload.shippingAddressId),
      addressRepo.findById(payload.billingAddressId),
    ]);

    if (!shippingAddress || String(shippingAddress.userId) !== String(user.id))
      error('Invalid shipping address', 400);

    if (!billingAddress || String(billingAddress.userId) !== String(user.id))
      error('Invalid billing address', 400);

    // Coupon lock is acquired before starting the transaction
    const session = await mongoose.startSession();
    let transactionStarted = false;
    let couponLocked = false;

    try {
      if (cart.couponId) {
        couponLocked = await couponRepo.lockCoupon({
          couponId: cart.couponId,
          userId: user.id,
          sessionId,
          scope: 'coupon',
          ttlSeconds: 60,
        });
        if (!couponLocked) error('Coupon is currently in use', 409);
      }

      session.startTransaction();
      transactionStarted = true;

      let subtotal = 0;
      let totalItems = 0;
      const orderItems = [];
      const calcItems = [];

      for (const item of cartItems) {
        const product = await productRepo.findById(item.productId);
        if (!product || product.status !== 'active')
          error('Product unavailable', 400);

        // Single-vendor setup: skip vendor availability checks

        const customerType =
          user.customerType === 'wholesale' &&
          user.verificationStatus === 'approved'
            ? 'wholesale'
            : 'retail';
        const unitPrice = pricingService.resolveUnitPrice({
          product,
          customerType,
        });

        await inventoryService.reserve(product._id, item.quantity, session, {
          ...context,
          userId: context.userId || user.id,
        });

        subtotal += unitPrice * item.quantity;
        totalItems += item.quantity;

        const lineSubtotal = unitPrice * item.quantity;
        const lineTotal = lineSubtotal;

        orderItems.push({
          productId: product._id,
          vendorId: product.vendorId || null,
          sku:
            product.sku ||
            product.productId ||
            `PRO-${String(product._id).slice(-6).toUpperCase()}`,
          quantity: item.quantity,
          price: unitPrice,
          discount: 0,
          taxableAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          taxComponents: { cgst: 0, sgst: 0, igst: 0 },
          taxMode: null,
          total: lineTotal,
          status: 'pending',
          hsnCode: product.hsnCode || null,
        });

        calcItems.push({
          productId: product._id,
          quantity: item.quantity,
          price: unitPrice,
          hsnCode: product.hsnCode || null,
          taxSlabs: product.taxSlabs || [],
          taxRate: product.taxRate,
          taxClassKey: product.taxClassKey,
          weight: product.weight || 0,
          length: product.length || 0,
          width: product.width || 0,
          height: product.height || 0,
          isHeavy: Boolean(product.isHeavy),
          isFragile: Boolean(product.isFragile),
        });
      }

      if (cart.couponId && !cart.couponCode) {
        error('Coupon data on cart is invalid', 400);
      }

      const totals = await checkoutTotals.calculateTotals({
        items: calcItems,
        shippingAddress,
        paymentMethod: payload.paymentMethod,
        couponCode: cart.couponCode || null,
        userId: user.id,
      });

      totals.items.forEach((calc, idx) => {
        orderItems[idx].discount = calc.discount;
        orderItems[idx].taxableAmount = calc.taxableAmount;
        orderItems[idx].taxPercent = calc.taxPercent;
        orderItems[idx].taxMode = calc.taxMode;
        orderItems[idx].taxComponents = calc.taxComponents;
        orderItems[idx].taxAmount = calc.taxAmount;
        orderItems[idx].total = calc.total;
      });

      subtotal = totals.subtotal;
      const discount = totals.discountAmount || 0;
      const taxAmount = totals.taxAmount || 0;
      const taxBreakdown = totals.taxBreakdown || { cgst: 0, sgst: 0, igst: 0 };
      const shippingFee = totals.shippingFee || 0;
      const grandTotal = totals.grandTotal || 0;
      const couponPayload = {
        couponId: totals.coupon?.couponId || null,
        couponCode: totals.coupon?.couponCode || null,
        discount,
      };

      const [order] = await orderRepo.createOrder(
        {
          userId: user.id,
          shippingAddressId: payload.shippingAddressId,
          billingAddressId: payload.billingAddressId,
          orderNumber: await generateOrderNumber(),
          totalItems,
          subtotal,
          discountAmount: discount,
          couponId: couponPayload.couponId,
          couponCode: couponPayload.couponCode,
          taxAmount,
          taxBreakdown,
          shippingFee,
          grandTotal,
          paymentStatus: PAYMENT_STATUS.PENDING,
          orderStatus: ORDER_STATUS.CREATED,
          paymentMethod: payload.paymentMethod,
          placedAt: new Date(),
        },
        session,
      );

      orderItems.forEach((i) => (i.orderId = order._id));
      await orderRepo.createItems(orderItems, session);

      if (couponPayload.couponId) {
        await couponRepo.recordUsage(
          {
            couponId: couponPayload.couponId,
            userId: user.id,
            orderId: order._id,
          },
          session,
        );
      }

      await session.commitTransaction();
      await cartCache.clearCart(user.id, sessionId);
      await orderJobs.scheduleAutoCancel(order._id);

      log.info('order_created', {
        type: 'order_event',
        entityId: order._id.toString(),
        orderId: order._id.toString(),
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      return order;
    } catch (e) {
      if (transactionStarted) await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
      if (couponLocked) {
        await couponRepo.unlockCoupon({
          couponId: cart?.couponId,
          userId: user.id,
          sessionId,
          scope: 'coupon',
        });
      }
    }
  }

  async ensurePaid(order) {
    if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
      error(
        'Order cannot be shipped before successful payment',
        409,
        'PAYMENT_REQUIRED',
      );
    }
  }

  async confirmOrder(orderId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await orderRepo.findById(orderId, session);
      if (!order) error('Order not found', 404);

      if (
        order.paymentStatus === PAYMENT_STATUS.PAID &&
        order.orderStatus === ORDER_STATUS.CONFIRMED
      ) {
        await session.commitTransaction();
        return order;
      }

      orderStateMachine.assertTransition(order.orderStatus, ORDER_STATUS.CONFIRMED);

      order.paymentStatus = PAYMENT_STATUS.PAID;
      order.orderStatus = ORDER_STATUS.CONFIRMED;
      order.isLocked = true;

      await order.save({ session });
      await invoiceService.generateFromOrder(order);

      if (order.couponId) {
        await couponRepo.recordUsage(
          { couponId: order.couponId, userId: order.userId, orderId: order._id },
          session,
        );
      }

      await session.commitTransaction();

      // 🔥 SIDE EFFECTS (OUTSIDE TX)
      await orderJobs.enqueueStatusNotification(order._id, 'confirmed');
      await orderJobs.dispatchShipmentPrep(order._id);
      await orderJobs.cancelAutoCancel(order._id);

      // Send order confirmation email (async, don't block)
      this.sendOrderConfirmationEmail(order).catch((err) => {
        logger.error('Order confirmation email failed', {
          orderId: order._id,
          error: err.message,
        });
      });

      // Log business metric
      businessMetrics.orderConfirmed(order, { orderId: order._id });

      return order;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  async failOrder(orderId, context = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await orderRepo.findById(orderId, session);
      if (!order) error('Order not found', 404);

      orderStateMachine.assertTransition(order.orderStatus, ORDER_STATUS.CANCELLED);

      if (
        order.orderStatus !== ORDER_STATUS.CREATED ||
        order.paymentStatus !== PAYMENT_STATUS.PENDING
      ) {
        await session.commitTransaction();
        return;
      }

      const items = await orderRepo.findItemsByOrder(orderId, session);
      for (const item of items) {
        await inventoryService.release(
          item.productId,
          item.quantity,
          session,
          { ...context, orderId },
        );
      }

      order.orderStatus = ORDER_STATUS.CANCELLED;
      order.paymentStatus = PAYMENT_STATUS.FAILED;
      await order.save({ session });

      // Release coupon usage + lock
      if (order.couponId) {
        await couponRepo.removeUsageByOrder(order._id, session);
        await couponRepo.unlockCoupon({
          couponId: order.couponId,
          userId: order.userId,
        });
      }

      await orderVersionRepo.createVersion?.({
        orderId: order._id,
        snapshot: order.toObject ? order.toObject() : order,
        reason: 'fail_order',
        actor: context.actor || { type: 'system' },
        session,
      });

      await session.commitTransaction();

      // Send cancellation email (async, don't block)
      this.sendOrderCancellationEmail(order).catch((err) => {
        logger.error('Order cancellation email failed', {
          orderId: order._id,
          error: err.message,
        });
      });
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  async markRefunded(orderId, isFullRefund, context = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await orderRepo.findById(orderId, session);
      if (!order) error('Order not found', 404);

      if (order.orderStatus === ORDER_STATUS.REFUNDED) {
        await session.commitTransaction();
        return order;
      }

      if (isFullRefund) {
        const items = await orderRepo.findItemsByOrder(orderId, session);
        for (const item of items) {
          await inventoryService.release(
            item.productId,
            item.quantity,
            session,
            { ...context, orderId },
          );
        }
      }

      orderStateMachine.assertTransition(order.orderStatus, ORDER_STATUS.REFUNDED);

      order.paymentStatus = PAYMENT_STATUS.REFUNDED;
      order.orderStatus = ORDER_STATUS.REFUNDED;
      await order.save({ session });

      // Roll back coupon usage on refund
      if (order.couponId) {
        await couponRepo.removeUsageByOrder(order._id, session);
        await couponRepo.unlockCoupon({
          couponId: order.couponId,
          userId: order.userId,
        });
      }

      await session.commitTransaction();

      // Send refund confirmation email (async, don't block)
      this.sendRefundConfirmationEmail(order, isFullRefund).catch((err) => {
        logger.error('Refund confirmation email failed', {
          orderId: order._id,
          error: err.message,
        });
      });

      return order;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  async markShipped({ orderId, actor, trackingNumber, carrier }) {
    const order = await orderRepo.findById(orderId);
    if (!order) {
      error('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Require payment before shipment
    assertOrderIsPaid(order);

    const updatedOrder = await orderRepo.applyOrderMutation({
      orderId,
      actor,
      reason: 'shipment',
      mutateFn: (o) => {
        orderStateMachine.assertTransition(o.orderStatus, 'shipped');
        o.orderStatus = 'shipped';
        o.shippedAt = new Date();
        o.shipment = {
          carrier,
          trackingNumber,
          shippedAt: new Date(),
        };
      },
    });

    // Send shipping notification email (async, don't block)
    this.sendShippingNotificationEmail(updatedOrder).catch((err) => {
      logger.error('Shipping notification email failed', {
        orderId: updatedOrder._id,
        error: err.message,
      });
    });

    await orderJobs.enqueueStatusNotification(orderId, 'shipped');
    return updatedOrder;
  }

  async markDelivered({ orderId, actor }) {
    const updatedOrder = await orderRepo.applyOrderMutation({
      orderId,
      actor,
      reason: 'delivery',
      mutateFn: (o) => {
        orderStateMachine.assertTransition(o.orderStatus, ORDER_STATUS.DELIVERED);
        o.orderStatus = ORDER_STATUS.DELIVERED;
        o.deliveredAt = new Date();
      },
    });

    // Send delivery confirmation email (async, don't block)
    this.sendDeliveryConfirmationEmail(updatedOrder).catch((err) => {
      logger.error('Delivery confirmation email failed', {
        orderId: updatedOrder._id,
        error: err.message,
      });
    });

    await orderJobs.enqueueStatusNotification(orderId, 'delivered');
    return updatedOrder;
  }

  async getUserOrders(userId, { status, limit = 20, page = 1, includeItems }) {
    const filter = { userId };
    if (status) filter.orderStatus = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (!includeItems) return orders.map(attachPaymentSummary);

    const orderIds = orders.map((o) => o._id);
    const items = await OrderItem.find({ orderId: { $in: orderIds } })
      .populate('productId', 'name')
      .lean();
    const productIds = items
      .map((item) => item.productId?._id || item.productId)
      .filter(Boolean);
    const images = await ProductImage.find({
      productId: { $in: productIds },
      isDeleted: false,
    })
      .sort({ isPrimary: -1, sortOrder: 1 })
      .lean();
    const imageMap = new Map();
    images.forEach((img) => {
      const key = String(img.productId);
      if (!imageMap.has(key)) {
        imageMap.set(key, []);
      }
      imageMap.get(key).push({ url: img.url, altText: img.altText });
    });

    const itemsByOrder = new Map();
    items.forEach((item) => {
      const orderKey = String(item.orderId);
      if (!itemsByOrder.has(orderKey)) itemsByOrder.set(orderKey, []);
      const productId = item.productId?._id || item.productId;
      const productImages = productId
        ? imageMap.get(String(productId)) || []
        : [];
      itemsByOrder.get(orderKey).push({
        ...item,
        product: item.productId
          ? { ...item.productId, images: productImages }
          : null,
      });
    });

    return orders.map((order) =>
      attachPaymentSummary({
        ...order,
        items: itemsByOrder.get(String(order._id)) || [],
      }),
    );
  }

  async getOrderDetail(user, orderId) {
    const order = await orderRepo.findAccessible(orderId, user);
    if (!order) error('Order not found', 404);

    const items = await OrderItem.find({ orderId })
      .populate('productId', 'name productType manufacturerBrand oemNumber vehicleBrand')
      .lean();
    const productIds = items
      .map((item) => item.productId?._id || item.productId)
      .filter(Boolean);
    const images = await ProductImage.find({
      productId: { $in: productIds },
      isDeleted: false,
    })
      .sort({ isPrimary: -1, sortOrder: 1 })
      .lean();
    const imageMap = new Map();
    images.forEach((img) => {
      const key = String(img.productId);
      if (!imageMap.has(key)) {
        imageMap.set(key, []);
      }
      imageMap.get(key).push({ url: img.url, altText: img.altText });
    });
    const enrichedItems = items.map((item) => {
      const productId = item.productId?._id || item.productId;
      const productImages = productId
        ? imageMap.get(String(productId)) || []
        : [];
      return {
        ...item,
        product: item.productId
          ? { ...item.productId, images: productImages }
          : null,
      };
    });
    const shipments = await shipmentRepo.list({
      orderItemId: { $in: items.map((i) => i._id) },
    });
    const events = await orderEventRepo.listByOrder(orderId);
    const notes = (events || []).filter((event) => event.noteType === 'customer');

    return {
      order: attachPaymentSummary(order),
      items: enrichedItems,
      shipments,
      notes,
    };
  }

  async adminList({ status, paymentStatus, from, to, page = 1, limit = 20 }) {
    const filter = {};
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return orders.map(attachPaymentSummary);
  }

  async adminGetOrder(orderId) {
    const order = await orderRepo.findByIdLean(orderId);
    if (!order) error('Order not found', 404);

    const items = await orderItemRepo.findByOrder(orderId);
    const shipments = await shipmentRepo.list({
      orderItemId: { $in: items.map((i) => i._id) },
    });

    const versions = await orderVersionRepo.listByOrder(orderId);
    const events = await orderEventRepo.listByOrder(orderId);

    return {
      order,
      items,
      shipments,
      versions,
      events,
    };
  }

  async updateByAdmin({ admin, orderId, payload }) {
    const order = await orderRepo.findById(orderId);
    if (!order) error('Order not found', 404);

    return orderRepo.applyOrderMutation({
      orderId,
      actor: { id: admin.id, role: admin.role },
      reason: 'admin_update',
      mutateFn: (o) => {
        orderStateMachine.assertTransition(o.orderStatus, payload.status);
        o.orderStatus = payload.status;
      },
    });
  }

  async updatePaymentByAdmin({ admin, orderId, payload }) {
    const order = await orderRepo.findById(orderId);
    if (!order) error('Order not found', 404);

    if (order.paymentMethod !== 'cod') {
      error('Manual payment updates are allowed only for COD orders', 400);
    }

    if ([PAYMENT_STATUS.FAILED, PAYMENT_STATUS.REFUNDED].includes(order.paymentStatus)) {
      error('Payment updates are not allowed for failed/refunded orders', 400);
    }

    const incomingAmount = Number(payload.amount || 0);
    if (!Number.isFinite(incomingAmount) || incomingAmount <= 0) {
      error('Amount must be greater than 0', 400);
    }

    const currentSummary = getPaymentSummary(order);
    const nextPaidAmount = currentSummary.paidAmount + incomingAmount;
    if (nextPaidAmount > currentSummary.totalAmount) {
      error('Paid amount cannot exceed total amount', 400);
    }

    const entry = {
      amount: incomingAmount,
      note: payload.note || '',
      method: 'cod',
      createdBy: admin.id,
      createdAt: new Date(),
    };

    const nextStatus = derivePaymentStatus({
      totalAmount: currentSummary.totalAmount,
      paidAmount: nextPaidAmount,
    });

    const updated = await orderRepo.applyOrderMutation({
      orderId,
      actor: { id: admin.id, role: admin.role },
      reason: 'admin_payment_update',
      mutateFn: (o) => {
        o.codPayments = Array.isArray(o.codPayments) ? [...o.codPayments, entry] : [entry];
        o.paymentStatus = nextStatus;
      },
    });

    return attachPaymentSummary(updated.toObject ? updated.toObject() : updated);
  }

  async setFraudFlag({ admin, orderId, payload }) {
    const order = await orderRepo.findById(orderId);
    if (!order) error('Order not found', 404);

    order.fraudFlag = payload.fraudFlag;
    order.fraudReason = payload.fraudReason || null;
    await order.save();

    await orderEventRepo.log({
      orderId,
      previousStatus: order.orderStatus,
      newStatus: order.orderStatus,
      actor: { id: admin.id, role: admin.role },
      type: 'FRAUD_FLAG',
      meta: payload,
    });

    return order;
  }
  async adminGetOrderHistory(orderId) {
    const exists = await orderRepo.exists(orderId);
    if (!exists) error('Order not found', 404);

    const versions = await orderVersionRepo.listByOrder(orderId);
    const events = await orderEventRepo.listByOrder(orderId);

    return { versions, events };
  }

  async adminCreateOrder({ admin, payload, context = {} }) {
    const log = logger.withContext({
      requestId: context.requestId || null,
      route: context.route,
      method: context.method,
      userId: context.userId || admin?.id || null,
    });

    const user = await userRepo.findById(payload.userId);
    if (!user) error('User not found', 404);
    if (user.role !== ROLES.CUSTOMER) {
      error('Orders can only be created for customers', 400);
    }

    await assertPaymentMethodEnabled(payload.paymentMethod, payload.gateway);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let shippingAddress = null;
      let billingAddress = null;
      let shippingAddressId = payload.shippingAddressId || null;
      let billingAddressId = payload.billingAddressId || null;

      if (shippingAddressId) {
        shippingAddress = await UserAddress.findById(shippingAddressId)
          .session(session)
          .lean();
        if (!shippingAddress) error('Shipping address not found', 404);
        if (String(shippingAddress.userId) !== String(user._id)) {
          error('Shipping address does not belong to user', 400);
        }
      } else {
        const [created] = await UserAddress.create(
          [{ ...payload.shippingAddress, userId: user._id }],
          { session },
        );
        shippingAddress = created.toObject ? created.toObject() : created;
        shippingAddressId = created._id;
      }

      if (payload.billingSameAsShipping) {
        billingAddress = shippingAddress;
        billingAddressId = shippingAddressId;
      } else if (billingAddressId) {
        billingAddress = await UserAddress.findById(billingAddressId)
          .session(session)
          .lean();
        if (!billingAddress) error('Billing address not found', 404);
        if (String(billingAddress.userId) !== String(user._id)) {
          error('Billing address does not belong to user', 400);
        }
      } else {
        const [created] = await UserAddress.create(
          [{ ...payload.billingAddress, userId: user._id }],
          { session },
        );
        billingAddress = created.toObject ? created.toObject() : created;
        billingAddressId = created._id;
      }

      let subtotal = 0;
      let totalItems = 0;
      let taxAmount = 0;
      const taxBreakdown = { cgst: 0, sgst: 0, igst: 0 };
      const orderItems = [];
      const shippingItems = [];
      const taxMetaByItem = new Map();

      for (const item of payload.items || []) {
        const product = await productRepo.findById(item.productId);

        if (!product || product.status !== 'active')
          error('Product unavailable', 400);

        // Single-vendor setup: skip vendor availability checks

        const customerType =
          user.customerType === 'wholesale' &&
          user.verificationStatus === 'approved'
            ? 'wholesale'
            : 'retail';
        const unitPrice = pricingService.resolveUnitPrice({
          product,
          customerType,
        });

        await inventoryService.reserve(product._id, item.quantity, session, {
          ...context,
          userId: context.userId || admin?.id,
        });

        subtotal += unitPrice * item.quantity;
        totalItems += item.quantity;

        orderItems.push({
          productId: product._id,
          vendorId: product.vendorId || null,
          sku:
            product.sku ||
            product.productId ||
            `PRO-${String(product._id).slice(-6).toUpperCase()}`,
          quantity: item.quantity,
          price: unitPrice,
          discount: 0,
          taxableAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          taxComponents: { cgst: 0, sgst: 0, igst: 0 },
          taxMode: null,
          total: 0,
          status: 'pending',
          hsnCode: product.hsnCode || null,
        });

        taxMetaByItem.set(String(product._id), {
          taxSlabs: product.taxSlabs || [],
          taxRate: product.taxRate,
          taxClassKey: product.taxClassKey,
          hsnCode: product.hsnCode,
        });

        shippingItems.push({
          quantity: item.quantity,
          weight: product.weight || 0,
          length: product.length || 0,
          width: product.width || 0,
          height: product.height || 0,
          isHeavy: Boolean(product.isHeavy),
          isFragile: Boolean(product.isFragile),
        });
      }

      const couponPayload = { couponId: null, couponCode: null, discount: 0 };
      if (payload.couponCode) {
        const preview = await couponService.preview({
          userId: user._id,
          code: payload.couponCode,
          orderSubtotal: subtotal,
          session,
        });
        couponPayload.couponId = preview.couponId;
        couponPayload.couponCode = preview.code;
        couponPayload.discount = preview.discountAmount || 0;
      }

      const manualDiscount = Math.max(0, Number(payload.manualDiscount || 0));
      const remainingAfterCoupon = Math.max(0, subtotal - couponPayload.discount);
      const safeManualDiscount = Math.min(manualDiscount, remainingAfterCoupon);
      const totalDiscount = couponPayload.discount + safeManualDiscount;
      const discountRatio = subtotal > 0 ? totalDiscount / subtotal : 0;
      const taxOverrideRate =
        payload.taxPercent != null ? Number(payload.taxPercent) / 100 : null;

      const rawTotals = [];
      const rawCgst = [];
      const rawSgst = [];
      const rawIgst = [];

      for (const item of orderItems) {
        const lineSubtotal = item.price * item.quantity;
        const lineDiscount = Math.round(lineSubtotal * discountRatio);
        const taxableBase = Math.max(0, lineSubtotal - lineDiscount);
        const taxMeta = taxMetaByItem.get(String(item.productId)) || {};
        const tax = await taxService.calculateGST({
          amount: taxableBase,
          destinationState: shippingAddress.state,
          destinationCity: shippingAddress.city,
          destinationPostalCode: shippingAddress.postalCode,
          destinationCountry: shippingAddress.country,
          hsnCode: taxMeta.hsnCode || item.hsnCode,
          productTaxSlabs: taxMeta.taxSlabs,
          taxRate: taxOverrideRate != null ? taxOverrideRate : taxMeta.taxRate,
          taxClassKey: taxMeta.taxClassKey,
          round: false,
        });

        item.discount = lineDiscount;
        item.taxableAmount = taxableBase;
        item.taxPercent = tax.ratePercent;
        item.taxMode = tax.mode;

        rawTotals.push(tax.total || 0);
        rawCgst.push(tax.components?.cgst || 0);
        rawSgst.push(tax.components?.sgst || 0);
        rawIgst.push(tax.components?.igst || 0);
      }

      const totalRawTax = rawTotals.reduce((sum, val) => sum + val, 0);
      taxAmount = roundCurrency(totalRawTax);

      const totalRawCgst = rawCgst.reduce((sum, val) => sum + val, 0);
      const totalRawSgst = rawSgst.reduce((sum, val) => sum + val, 0);
      const totalRawIgst = rawIgst.reduce((sum, val) => sum + val, 0);

      if (totalRawIgst > 0) {
        taxBreakdown = { cgst: 0, sgst: 0, igst: taxAmount };
      } else {
        const cgstRounded = roundCurrency(totalRawCgst);
        let sgstRounded = roundCurrency(totalRawSgst);
        const diff = roundCurrency(taxAmount - (cgstRounded + sgstRounded));
        sgstRounded = roundCurrency(sgstRounded + diff);
        taxBreakdown = { cgst: cgstRounded, sgst: sgstRounded, igst: 0 };
      }

      allocateRoundedComponent(orderItems, taxBreakdown.cgst, rawCgst, 'cgstComponent');
      allocateRoundedComponent(orderItems, taxBreakdown.sgst, rawSgst, 'sgstComponent');
      allocateRoundedComponent(orderItems, taxBreakdown.igst, rawIgst, 'igstComponent');

      orderItems.forEach((item) => {
        const cgst = item.cgstComponent || 0;
        const sgst = item.sgstComponent || 0;
        const igst = item.igstComponent || 0;
        item.taxComponents = { cgst, sgst, igst };
        item.taxAmount = roundCurrency(cgst + sgst + igst);
        item.total = roundCurrency(item.taxableAmount + item.taxAmount);
        delete item.cgstComponent;
        delete item.sgstComponent;
        delete item.igstComponent;
      });

      const shippingFee =
        payload.shippingFee != null
          ? Number(payload.shippingFee)
          : await shippingService.calculate({
              subtotal: subtotal - totalDiscount,
              items: shippingItems,
              address: shippingAddress,
              paymentMethod: payload.paymentMethod,
            });
      const grandTotal = subtotal - totalDiscount + taxAmount + shippingFee;

      const [order] = await orderRepo.createOrder(
        {
          userId: user._id,
          shippingAddressId,
          billingAddressId,
          orderNumber: await generateOrderNumber(),
          totalItems,
          subtotal,
          discountAmount: totalDiscount,
          couponId: couponPayload.couponId,
          couponCode: couponPayload.couponCode,
          taxAmount,
          taxBreakdown,
          shippingFee,
          grandTotal,
          paymentStatus: PAYMENT_STATUS.PENDING,
          orderStatus: ORDER_STATUS.CREATED,
          paymentMethod: payload.paymentMethod,
          placedAt: new Date(),
        },
        session,
      );

      orderItems.forEach((i) => (i.orderId = order._id));
      await orderRepo.createItems(orderItems, session);

      if (couponPayload.couponId) {
        await couponRepo.recordUsage(
          {
            couponId: couponPayload.couponId,
            userId: user._id,
            orderId: order._id,
          },
          session,
        );
      }

      await session.commitTransaction();
      await orderJobs.scheduleAutoCancel(order._id);

      log.info('order_manual_created', {
        type: 'order_event',
        entityId: order._id.toString(),
        orderId: order._id.toString(),
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      return order;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  /* =====================================================
     📧 EMAIL NOTIFICATIONS
  ===================================================== */

  /**
   * Send order confirmation email after payment success
   * Called from confirmOrder() method
   */
  async sendOrderConfirmationEmail(order) {
    try {
      const user = await require('../users/user.repo').findById(order.userId);
      if (!user || !user.email) {
        logger.warn('Cannot send order confirmation - user or email missing', {
          orderId: order._id,
          userId: order.userId,
        });
        return;
      }

      await emailNotification.send({
        templateName: 'order_confirmation',
        to: user.email,
        variables: {
          customerName: user.name || 'Customer',
          orderNumber: order.orderNumber,
          orderDate: new Date(order.createdAt).toLocaleDateString('en-IN'),
          grandTotal: `₹${order.grandTotal.toFixed(2)}`,
          itemCount: order.items?.length || 0,
          orderDetailsLink: `${process.env.FRONTEND_ORIGIN || 'https://yourdomain.com'}/orders/${order._id}`,
        },
      });

      logger.info('Order confirmation email sent successfully', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        email: user.email,
      });
    } catch (err) {
      logger.error('Failed to send order confirmation email', {
        orderId: order._id,
        error: err.message,
        stack: err.stack,
      });
      // Don't throw - email failure shouldn't break order confirmation
    }
  }

  /**
   * Send shipping notification email
   * Called from markShipped() method
   */
  async sendShippingNotificationEmail(order) {
    try {
      const user = await require('../users/user.repo').findById(order.userId);
      if (!user || !user.email) {
        logger.warn('Cannot send shipping notification - user or email missing', {
          orderId: order._id,
          userId: order.userId,
        });
        return;
      }

      const trackingNumber = order.shipment?.trackingNumber || 'N/A';
      const carrier = order.shipment?.carrier || 'Courier Service';
      const trackingUrl = trackingNumber !== 'N/A'
        ? `https://www.google.com/search?q=${encodeURIComponent(carrier + ' ' + trackingNumber)}`
        : '';

      await emailNotification.send({
        templateName: 'order_shipped',
        to: user.email,
        variables: {
          customerName: user.name || 'Customer',
          orderNumber: order.orderNumber,
          carrier: carrier,
          trackingNumber: trackingNumber,
          trackingUrl: trackingUrl,
          estimatedDelivery: order.shipment?.estimatedDeliveryDate
            ? new Date(order.shipment.estimatedDeliveryDate).toLocaleDateString('en-IN')
            : '3-7 business days',
        },
      });

      logger.info('Shipping notification email sent successfully', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        email: user.email,
        trackingNumber: trackingNumber,
      });
    } catch (err) {
      logger.error('Failed to send shipping notification email', {
        orderId: order._id,
        error: err.message,
        stack: err.stack,
      });
      // Don't throw - email failure shouldn't break shipping update
    }
  }

  /**
   * Send delivery confirmation email
   * Called from markDelivered() method
   */
  async sendDeliveryConfirmationEmail(order) {
    try {
      const user = await require('../users/user.repo').findById(order.userId);
      if (!user || !user.email) {
        logger.warn('Cannot send delivery confirmation - user or email missing', {
          orderId: order._id,
          userId: order.userId,
        });
        return;
      }

      await emailNotification.send({
        templateName: 'order_delivered',
        to: user.email,
        variables: {
          customerName: user.name || 'Customer',
          orderNumber: order.orderNumber,
          deliveryDate: new Date(order.deliveredAt).toLocaleDateString('en-IN'),
          orderDetailsLink: `${process.env.FRONTEND_ORIGIN || 'https://yourdomain.com'}/orders/${order._id}`,
        },
      });

      logger.info('Delivery confirmation email sent successfully', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        email: user.email,
      });
    } catch (err) {
      logger.error('Failed to send delivery confirmation email', {
        orderId: order._id,
        error: err.message,
        stack: err.stack,
      });
    }
  }

  /**
   * Send order cancellation email
   * Called from failOrder() method
   */
  async sendOrderCancellationEmail(order) {
    try {
      const user = await require('../users/user.repo').findById(order.userId);
      if (!user || !user.email) {
        logger.warn('Cannot send cancellation email - user or email missing', {
          orderId: order._id,
          userId: order.userId,
        });
        return;
      }

      await emailNotification.send({
        templateName: 'order_cancelled',
        to: user.email,
        variables: {
          customerName: user.name || 'Customer',
          orderNumber: order.orderNumber,
          cancellationDate: new Date().toLocaleDateString('en-IN'),
          refundInfo: order.paymentStatus === 'pending' 
            ? 'No payment was processed.'
            : 'Refund will be processed within 5-7 business days.',
        },
      });

      logger.info('Order cancellation email sent successfully', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        email: user.email,
      });
    } catch (err) {
      logger.error('Failed to send order cancellation email', {
        orderId: order._id,
        error: err.message,
        stack: err.stack,
      });
    }
  }

  /**
   * Send refund confirmation email
   * Called from markRefunded() method
   */
  async sendRefundConfirmationEmail(order, isFullRefund) {
    try {
      const user = await require('../users/user.repo').findById(order.userId);
      if (!user || !user.email) {
        logger.warn('Cannot send refund confirmation - user or email missing', {
          orderId: order._id,
          userId: order.userId,
        });
        return;
      }

      await emailNotification.send({
        templateName: 'order_refunded',
        to: user.email,
        variables: {
          customerName: user.name || 'Customer',
          orderNumber: order.orderNumber,
          refundType: isFullRefund ? 'Full Refund' : 'Partial Refund',
          refundAmount: `₹${order.grandTotal.toFixed(2)}`,
          refundDate: new Date().toLocaleDateString('en-IN'),
          estimatedProcessing: '5-7 business days',
        },
      });

      logger.info('Refund confirmation email sent successfully', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        email: user.email,
        isFullRefund,
      });
    } catch (err) {
      logger.error('Failed to send refund confirmation email', {
        orderId: order._id,
        error: err.message,
        stack: err.stack,
      });
    }
  }
}

module.exports = new OrderService();
