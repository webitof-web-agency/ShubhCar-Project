// Temporary admin service methods for orders - to be integrated into orders.service.js
const Order = require('../../models/Order.model');
const orderRepo = require('./order.repo');
const orderEventRepo = require('./orderEvent.repo');
const shipmentRepo = require('../shipments/shipment.repo');
const { error } = require('../../utils/apiResponse');
const { attachPaymentSummary } = require('./paymentSummary');
const { ORDER_STATUS_LIST } = require('../../constants/orderStatus');
const mongoose = require('mongoose');
const ProductImage = require('../../models/ProductImage.model');

// Admin list orders method
exports.adminList = async (query = {}) => {
  const {
    status,
    paymentStatus,
    page = 1,
    limit = 20,
    from,
    to,
    userId,
    search,
    summary,
  } = query;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const skip = (safePage - 1) * safeLimit;
  const filter = { isDeleted: false };

  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    filter.userId = new mongoose.Types.ObjectId(userId);
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const escapeRegex = (value = '') =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchValue = typeof search === 'string' ? search.trim() : '';
  const hasSearch = Boolean(searchValue);
  const searchRegex = hasSearch ? new RegExp(escapeRegex(searchValue), 'i') : null;
  const searchMatch = hasSearch
    ? {
      $or: [
        { orderNumber: searchRegex },
        { 'user.firstName': searchRegex },
        { 'user.lastName': searchRegex },
        { 'user.email': searchRegex },
        { 'user.phone': searchRegex },
      ],
    }
    : null;

  if (hasSearch && mongoose.Types.ObjectId.isValid(searchValue)) {
    searchMatch.$or.push({ _id: new mongoose.Types.ObjectId(searchValue) });
  }

  const pipeline = [
    { $match: filter },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  ];

  const summaryMode = String(summary || '').toLowerCase() === 'true' || summary === '1';

  if (!summaryMode) {
    pipeline.push(
      {
        $lookup: {
          from: 'useraddresses',
          localField: 'shippingAddressId',
          foreignField: '_id',
          as: 'shippingAddress',
        },
      },
      { $unwind: { path: '$shippingAddress', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          userId: '$user',
          shippingAddressId: '$shippingAddress',
        },
      },
    );
  } else {
    pipeline.push(
      {
        $addFields: {
          userId: '$user',
        },
      },
      {
        $project: {
          user: 0,
          shippingAddressId: 0,
          billingAddressId: 0,
          shippingAddress: 0,
          billingAddress: 0,
          items: 0,
          codPayments: 0,
          taxBreakdown: 0,
          couponId: 0,
        },
      },
    );
  }

  if (searchMatch) {
    pipeline.push({ $match: searchMatch });
  }

  pipeline.push({
    $facet: {
      items: [{ $skip: skip }, { $limit: safeLimit }],
      total: [{ $count: 'count' }],
    },
  });

  const [result] = await Order.aggregate(pipeline);
  const items = (result?.items || []).map(attachPaymentSummary);
  const total = result?.total?.[0]?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
};

// Admin get status counts method
exports.adminGetStatusCounts = async () => {
  const counts = await Order.aggregate([
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  const statusCounts = ORDER_STATUS_LIST.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    { all: 0 },
  );

  counts.forEach(({ _id, count }) => {
    if (_id) {
      statusCounts[_id] = count;
      statusCounts.all += count;
    }
  });

  return statusCounts;
};

// Admin get single order
exports.adminGetOrder = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate('userId', 'firstName lastName email phone customerType')
    .populate('shippingAddressId')
    .populate('billingAddressId')
    .lean();
  if (!order) {
    error('Order not found', 404);
  }

  const [items, shipments, events] = await Promise.all([
    orderRepo.findItemsByOrderWithDetails(orderId),
    shipmentRepo.list({ orderId }),
    orderEventRepo.listByOrder(orderId),
  ]);
  const productIds = items
    .map((item) => item.productId?._id || item.productId)
    .filter(Boolean);
  const images = productIds.length
    ? await ProductImage.find({ productId: { $in: productIds }, isDeleted: false })
        .sort({ isPrimary: -1, sortOrder: 1 })
        .lean()
    : [];
  const imageMap = new Map();
  images.forEach((img) => {
    const key = String(img.productId);
    if (!imageMap.has(key)) imageMap.set(key, []);
    imageMap.get(key).push({ url: img.url, altText: img.altText });
  });
  const enrichedItems = items.map((item) => {
    const productId = item.productId?._id || item.productId;
    const productImages = productId ? imageMap.get(String(productId)) || [] : [];
    if (item.productId && typeof item.productId === 'object') {
      return { ...item, productId: { ...item.productId, images: productImages } };
    }
    return { ...item, productImages };
  });
  const result = { order: attachPaymentSummary(order), items: enrichedItems, shipments, events };
  return result;
};

// Admin get order history
exports.adminGetOrderHistory = async (orderId) => {
  const events = await orderEventRepo.findByOrder(orderId);
  return events;
};

// Admin get order notes
exports.adminGetOrderNotes = async (orderId) => {
  const events = await orderEventRepo.findByOrder(orderId);
  // Filter for note-type events
  const notes = events.filter(e => e.noteType && ['customer', 'system', 'private'].includes(e.noteType));
  return notes;
};

// Admin add order note
exports.adminAddOrderNote = async ({ admin, orderId, payload }) => {
  const { noteType, noteContent } = payload;
  
  const order = await orderRepo.findByIdLean(orderId);
  if (!order) error('Order not found', 404);

  const event = await orderEventRepo.log({
    orderId,
    type: 'NOTE_ADDED',
    previousStatus: order.orderStatus,
    newStatus: order.orderStatus,
    actor: { type: 'admin', actorId: admin.id },
    noteType: noteType || 'private',
    noteContent,
  });

  return event;
};
