export const MENU_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'solar:widget-5-bold-duotone',
    url: '/dashboard',
    permission: 'dashboard.view',
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: 'solar:bag-5-bold-duotone',
    url: '/orders/orders-list',
    permission: 'orders.view',
  },
  {
    key: 'invoices',
    label: 'Invoice',
    icon: 'solar:bill-list-bold-duotone',
    url: '/invoice/invoice-list',
    permission: 'invoices.view',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: 'solar:chart-square-bold-duotone',
    url: '/analytics', // To create/verify
    permission: 'analytics.view',
  },
  {
    key: 'coupons',
    label: 'Coupons',
    icon: 'solar:leaf-bold-duotone',
    url: '/coupons/coupons-list',
    permission: 'coupons.view',
  },
  {
    key: 'customer',
    label: 'Customers',
    icon: 'solar:users-group-two-rounded-bold-duotone',
    url: '/customer/customer-list',
    permission: 'customers.view',
  },
  {
    key: 'wholesale',
    label: 'Wholesale Customers',
    icon: 'solar:shop-2-bold-duotone',
    url: '/wholesale', // To create
    permission: 'wholesale.view',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: 'solar:box-bold-duotone',
    url: '/inventory',
    permission: 'inventory.view',
  },
  {
    key: 'review',
    label: 'Reviews',
    icon: 'solar:chat-square-like-bold-duotone',
    url: '/review',
    permission: 'reviews.view',
  },
  {
    key: 'products',
    label: 'Products',
    icon: 'solar:t-shirt-bold-duotone',
    type: 'collapsible',
    permission: 'products.view',
    children: [
      {
        key: 'all-products',
        label: 'All Products',
        url: '/products/product-list',
        permission: 'products.view',
      },
      {
        key: 'add-product',
        label: 'Add New Product',
        url: '/products/product-add',
        permission: 'products.create',
      },
      {
        key: 'bulk-add',
        label: 'Bulk Add',
        url: '/products/bulk-add',
        permission: 'products.update',
      },
      {
        key: 'category',
        label: 'Category',
        url: '/categories',
        permission: ['products.create', 'products.update', 'products.delete'],
      },
      {
        key: 'manufacturer-brand',
        label: 'Manufacturer Brand',
        url: '/manufacturer-brands',
        permission: ['products.create', 'products.update', 'products.delete'],
      },
    ],
  },
  {
    key: 'vehicles',
    label: 'Vehicle',
    icon: 'solar:bus-bold-duotone',
    type: 'collapsible',
    permission: 'products.view',
    children: [
      {
        key: 'vehicle-list',
        label: 'Vehicle List',
        url: '/vehicles',
        permission: ['products.create', 'products.update', 'products.delete'],
      },
      {
        key: 'vehicle-brand',
        label: 'Vehicle Brand',
        url: '/vehicle-brands',
        permission: ['products.create', 'products.update', 'products.delete'],
      },
      {
        key: 'vehicle-model',
        label: 'Vehicle Model',
        url: '/models',
        permission: ['products.create', 'products.update', 'products.delete'],
      },
      {
        key: 'vehicle-years',
        label: 'Model Year',
        url: '/vehicle-years',
        permission: ['products.create', 'products.update', 'products.delete'],
      },
      {
        key: 'vehicle-variant-attributes',
        label: 'Vehicle Variant Attributes',
        url: '/vehicle-variant-attributes',
        permission: ['products.create', 'products.update', 'products.delete'],
      },
    ],
  },
  {
    key: 'entries',
    label: 'Entries', // Contact Form Data
    icon: 'solar:inbox-line-bold-duotone',
    url: '/entries', // To create
    permission: 'entries.view',
  },
  {
    key: 'media',
    label: 'Media',
    icon: 'solar:gallery-bold-duotone',
    url: '/media', // To create
    permission: 'media.view',
  },
  {
    key: 'users',
    label: 'Users',
    icon: 'solar:user-speak-rounded-bold-duotone',
    type: 'collapsible',
    permission: 'users.view',
    children: [
      {
        key: 'users-all',
        label: 'All Users',
        url: '/users',
        permission: 'users.view',
      },
      {
        key: 'users-roles',
        label: 'User Roles',
        url: '/users/roles',
        permission: 'roles.view',
      },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'solar:settings-bold-duotone',
    type: 'collapsible',
    permission: 'settings.view',
    children: [
      {
        key: 'settings-general',
        label: 'General Settings',
        url: '/settings',
        permission: 'settings.view',
      },
      {
        key: 'tax-settings',
        label: 'Tax Settings',
        url: '/tax-settings',
        permission: 'settings.view',
      },
      {
        key: 'payment-settings',
        label: 'Payment Settings',
        url: '/payment-settings',
        permission: 'settings.view',
      },
    ],
  },
]
