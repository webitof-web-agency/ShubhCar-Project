export const PERMISSION_MATRIX = [
  { resource: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { resource: 'analytics', label: 'Analytics', actions: ['view'] },
  { resource: 'orders', label: 'Orders', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'invoices', label: 'Invoices', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'products', label: 'Products', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'customers', label: 'Customers', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'wholesale', label: 'Wholesale Customers', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'inventory', label: 'Inventory', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'reviews', label: 'Reviews', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'media', label: 'Media', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'entries', label: 'Entries', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'coupons', label: 'Coupons', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'users', label: 'Users', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'roles', label: 'User Roles', actions: ['view', 'create', 'update', 'delete'] },
  { resource: 'settings', label: 'Settings', actions: ['view', 'update'] },
]

export const PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete']
