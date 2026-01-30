export const ORDER_STATUS = {
  CREATED: 'created',
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  ON_HOLD: 'on_hold',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REFUNDED: 'refunded',
};

export const ORDER_STATUS_LIST = [
  ORDER_STATUS.CREATED,
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.ON_HOLD,
  ORDER_STATUS.FAILED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.RETURNED,
  ORDER_STATUS.REFUNDED,
];

export const ADMIN_STATUS_UPDATES = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.ON_HOLD,
  ORDER_STATUS.FAILED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.RETURNED,
  ORDER_STATUS.REFUNDED,
];

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.CREATED]: 'Order Placed',
  [ORDER_STATUS.PENDING_PAYMENT]: 'Pending Payment',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.SHIPPED]: 'Shipped',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.ON_HOLD]: 'On hold',
  [ORDER_STATUS.FAILED]: 'Failed',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
  [ORDER_STATUS.RETURNED]: 'Returned',
  [ORDER_STATUS.REFUNDED]: 'Refunded',
};

export const ORDER_STATUS_BADGE = {
  [ORDER_STATUS.CREATED]: { bg: 'secondary', text: 'Order Placed' },
  [ORDER_STATUS.PENDING_PAYMENT]: { bg: 'warning', text: 'Pending Payment' },
  [ORDER_STATUS.CONFIRMED]: { bg: 'info', text: 'Confirmed' },
  [ORDER_STATUS.SHIPPED]: { bg: 'primary', text: 'Shipped' },
  [ORDER_STATUS.OUT_FOR_DELIVERY]: { bg: 'primary', text: 'Out for Delivery' },
  [ORDER_STATUS.DELIVERED]: { bg: 'success', text: 'Delivered' },
  [ORDER_STATUS.ON_HOLD]: { bg: 'secondary', text: 'On hold' },
  [ORDER_STATUS.CANCELLED]: { bg: 'danger', text: 'Cancelled' },
  [ORDER_STATUS.RETURNED]: { bg: 'warning', text: 'Returned' },
  [ORDER_STATUS.REFUNDED]: { bg: 'dark', text: 'Refunded' },
  [ORDER_STATUS.FAILED]: { bg: 'danger', text: 'Failed' },
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_STATUS_LIST = [
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.PARTIALLY_PAID,
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.REFUNDED,
];

export const PAYMENT_STATUS_BADGE = {
  [PAYMENT_STATUS.PENDING]: { bg: 'secondary', text: 'Pending', textColor: 'light' },
  [PAYMENT_STATUS.PARTIALLY_PAID]: { bg: 'warning', text: 'Partially Paid', textColor: 'dark' },
  [PAYMENT_STATUS.PAID]: { bg: 'success', text: 'Paid' },
  [PAYMENT_STATUS.FAILED]: { bg: 'danger', text: 'Failed' },
  [PAYMENT_STATUS.REFUNDED]: { bg: 'secondary', text: 'Refunded' },
};

export const getStatusBadge = (status) =>
  ORDER_STATUS_BADGE[status] || ORDER_STATUS_BADGE[ORDER_STATUS.CREATED];

export const getPaymentStatusBadge = (status) =>
  PAYMENT_STATUS_BADGE[status] || PAYMENT_STATUS_BADGE[PAYMENT_STATUS.PENDING];

export const getOrderStatusLabel = (status) =>
  ORDER_STATUS_LABELS[status] || status?.replace(/_/g, ' ') || ORDER_STATUS_LABELS[ORDER_STATUS.CREATED];

export const DASHBOARD_STATUS_CARDS = [
  { status: ORDER_STATUS.CREATED, title: 'Order Placed', icon: 'solar:clock-circle-broken', variant: 'warning' },
  { status: ORDER_STATUS.CONFIRMED, title: 'Confirmed', icon: 'solar:refresh-circle-broken', variant: 'info' },
  { status: ORDER_STATUS.SHIPPED, title: 'Shipped', icon: 'solar:box-broken', variant: 'primary' },
  { status: ORDER_STATUS.DELIVERED, title: 'Delivered', icon: 'solar:check-circle-broken', variant: 'success' },
];
