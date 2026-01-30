const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../../../models/User.model');
const Product = require('../../../models/Product.model');
const ProductVariant = require('../../../models/ProductVariant.model');
const Category = require('../../../models/Category.model');
const Vendor = require('../../../models/Vendor.model');
const UserAddress = require('../../../models/UserAddress.model');
const Settings = require('../../../models/Settings.model');
const Cart = require('../../../models/Cart.model');
const CartItem = require('../../../models/CartItem.model');
const Order = require('../../../models/Order.model');
const OrderItem = require('../../../models/OrderItem.model');

/**
 * Create a test user
 */
async function createUser(overrides = {}) {
  const defaultUser = {
    firstName: 'Test',
    lastName: 'User',
    email: `test${Date.now()}@example.com`,
    password: await bcrypt.hash('Password123!', 10),
    phone: '1234567890',
    role: 'customer',
    customerType: 'retail',
    verificationStatus: 'approved',
    isDeleted: false,
  };

  const user = await User.create({ ...defaultUser, ...overrides });
  return user;
}

/**
 * Create a test vendor
 */
async function createVendor(overrides = {}) {
  const defaultVendor = {
    name: `Vendor ${Date.now()}`,
    email: `vendor${Date.now()}@example.com`,
    phone: '9876543210',
    status: 'active',
    isDeleted: false,
  };

  const vendor = await Vendor.create({ ...defaultVendor, ...overrides });
  return vendor;
}

/**
 * Create a test category
 */
async function createCategory(overrides = {}) {
  const defaultCategory = {
    name: `Category ${Date.now()}`,
    slug: `category-${Date.now()}`,
    status: 'active',
    isDeleted: false,
  };

  const category = await Category.create({ ...defaultCategory, ...overrides });
  return category;
}

/**
 * Create a test product with variants
 */
async function createProduct(options = {}) {
  const {
    vendorId,
    categoryId,
    variantsCount = 1,
    stockQty = 100,
    reservedQty = 0,
    ...overrides
  } = options;

  const vendor = vendorId || (await createVendor())._id;
  const category = categoryId || (await createCategory())._id;

  const defaultProduct = {
    name: `Product ${Date.now()}`,
    slug: `product-${Date.now()}`,
    price: 100,
    vendorId: vendor,
    categoryId: category,
    status: 'active',
    isDeleted: false,
  };

  const product = await Product.create({ ...defaultProduct, ...overrides });

  // Create variants
  const variants = [];
  for (let i = 0; i < variantsCount; i++) {
    const variant = await ProductVariant.create({
      productId: product._id,
      variantName: `Variant ${i + 1}`,
      sku: `SKU-${product._id}-${i + 1}`,
      price: 100 + i * 10,
      stockQty,
      reservedQty,
      status: 'active',
    });
    variants.push(variant);
  }

  return { product, variants };
}

/**
 * Create shipping configuration in Settings
 */
async function createShippingConfig(config = {}) {
  const defaultConfig = {
    flatRate: 100,
    freeShippingAbove: 5000,
  };

  const shippingConfig = await Settings.create({
    key: 'shipping_config',
    value: { ...defaultConfig, ...config },
  });

  return shippingConfig;
}

/**
 * Create a user address
 */
async function createAddress(userId, overrides = {}) {
  const defaultAddress = {
    userId,
    fullName: 'Test User',
    phone: '1234567890',
    addressLine1: '123 Test Street',
    line1: '123 Test Street',
    postalCode: '560001',
    city: 'Test City',
    state: 'KA',
    pincode: '560001',
    country: 'India',
    isDefault: true,
  };

  const address = await UserAddress.create({ ...defaultAddress, ...overrides });
  return address;
}

/**
 * Create a cart with items
 */
async function createCart(userId, items = []) {
  const cart = await Cart.create({
    userId,
    sessionId: null,
  });

  const cartItems = [];
  for (const item of items) {
    const cartItem = await CartItem.create({
      cartId: cart._id,
      productVariantId: item.variantId,
      sku: item.sku || `SKU-${item.variantId}`,
      quantity: item.quantity,
      priceType: item.priceType || 'retail',
      priceAtTime: item.price || 100,
    });
    cartItems.push(cartItem);
  }

  return { cart, cartItems };
}

/**
 * Create an order with items
 */
async function createOrder(options = {}) {
  const {
    userId,
    shippingAddressId,
    billingAddressId,
    items = [],
    paymentStatus = 'pending',
    orderStatus = 'created',
    ...overrides
  } = options;

  const defaultOrder = {
    userId,
    shippingAddressId,
    billingAddressId,
    orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    totalItems: items.length,
    subtotal: 0,
    taxAmount: 0,
    shippingFee: 100,
    discountAmount: 0,
    grandTotal: 0,
    paymentStatus,
    orderStatus,
    paymentMethod: 'card',
  };

  // Calculate totals
  let subtotal = 0;
  items.forEach((item) => {
    subtotal += item.price * item.quantity;
  });

  defaultOrder.subtotal = subtotal;
  defaultOrder.grandTotal = subtotal + defaultOrder.shippingFee;

  const order = await Order.create({ ...defaultOrder, ...overrides });

  // Create order items
  const orderItems = [];
  for (const item of items) {
    const orderItem = await OrderItem.create({
      orderId: order._id,
      productId: item.productId,
      productVariantId: item.variantId,
      vendorId: item.vendorId,
      sku: item.sku || `SKU-${item.variantId}`,
      quantity: item.quantity,
      price: item.price,
      taxAmount: 0,
      total: item.price * item.quantity,
    });
    orderItems.push(orderItem);
  }

  return { order, orderItems };
}

module.exports = {
  createUser,
  createVendor,
  createCategory,
  createProduct,
  createShippingConfig,
  createAddress,
  createCart,
  createOrder,
};
