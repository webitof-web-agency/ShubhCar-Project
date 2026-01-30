const { createHash } = require('crypto');

const hashQuery = (query = {}) =>
  createHash('sha1')
    .update(JSON.stringify(query || {}))
    .digest('hex')
    .slice(0, 10);

const hashSha256 = (val) =>
  createHash('sha256').update(String(val || '')).digest('hex');

const normalizeRole = (user) =>
  user &&
  user.customerType === 'wholesale' &&
  user.verificationStatus === 'approved'
    ? 'wholesale'
    : 'retail';

const normalizeLang = (user) => user?.preferredLanguage || 'en';

module.exports = {
  hashQuery,

  catalog: {
    productsList: (query) => `catalog:products:${hashQuery(query)}`,
    productsByCategory: (categoryId, query) =>
      `catalog:products:category:${categoryId}:${hashQuery(query)}`,
    product: (slug) => `catalog:product:${slug}`,
    categories: {
      roots: () => 'catalog:categories:roots',
      children: (id) => `catalog:categories:children:${id}`,
      slug: (slug) => `catalog:categories:slug:${slug}`,
      tree: () => 'catalog:categories:tree',
    },
  },

  product: {
    bySlug: ({ slug, user }) =>
      `product:slug:${slug}:role:${normalizeRole(user)}:lang:${normalizeLang(
        user,
      )}`,
    listByCategory: ({
      categoryId,
      page = 1,
      limit = 20,
      sort = 'created_desc',
      cursor = 'none',
      filters = {},
    }) =>
      `products:list:cat:${categoryId}:p:${page}:l:${limit}:s:${sort}:c:${cursor}:f:${hashQuery(
        filters,
      )}`,
    featured: ({ page = 1, limit = 20, cursor = 'none' } = {}) =>
      `products:featured:p:${page}:l:${limit}:c:${cursor}`,
  },

  inventory: {
    product: (productId) => `inventory:${productId}`,
  },

  otp: (identifier) => `otp:${hashSha256(identifier)}`,

  user: {
    byId: (id) => `user:${id}`,
    byEmail: (email) => `user:email:${email}`,
    byPhone: (phone) => `user:phone:${phone}`,
  },

  wishlist: {
    user: (userId) => `wishlist:user:${userId}`,
  },

  notifications: {
    user: (userId, audience = 'user') => `notif:user:${userId}:${audience}`,
  },

  orderItems: {
    byOrder: (orderId) => `order_items:order:${orderId}`,
    byVendor: (vendorId, status = 'all') =>
      `order_items:vendor:${vendorId}:status:${status}`,
  },

  reviews: {
    product: (productId) => `reviews:product:${productId}`,
    aggregate: (productId) => `reviews:agg:${productId}`,
  },

  cms: {
    page: (slug) => `cms:page:${slug}`,
    seo: (slug) => `cms:seo:${slug}`,
  },

  analytics: {
    dashboard: () => 'analytics:dashboard',
    revenueChart: (query) => `analytics:revenue_chart:${hashQuery(query)}`,
    revenueSummary: (query) => `analytics:revenue:${hashQuery(query)}`,
    salesByState: (query) => `analytics:sales_by_state:${hashQuery(query)}`,
    salesByCity: (query) => `analytics:sales_by_city:${hashQuery(query)}`,
    users: () => 'analytics:users',
    topProducts: (query) => `analytics:top_products:${hashQuery(query)}`,
    topCategories: (query) => `analytics:top_categories:${hashQuery(query)}`,
    topBrands: (query) => `analytics:top_brands:${hashQuery(query)}`,
    inventory: (query) => `analytics:inventory:${hashQuery(query)}`,
    inventoryTurnover: (query) =>
      `analytics:inventory_turnover:${hashQuery(query)}`,
    reviews: () => 'analytics:reviews',
    repeatCustomers: (query) =>
      `analytics:repeat_customers:${hashQuery(query)}`,
    fulfillment: (query) => `analytics:fulfillment:${hashQuery(query)}`,
    funnel: (query) => `analytics:funnel:${hashQuery(query)}`,
    orderStatusCounts: () => 'analytics:order_status_counts',
  },
};
