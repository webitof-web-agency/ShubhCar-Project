const { PAYMENT_STATUS } = require('../../constants/paymentStatus');

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getTotalAmount = (order) => toNumber(order?.grandTotal || order?.totalAmount || 0);

const getPaidAmount = (order) => {
  if (!order) return 0;
  const total = getTotalAmount(order);
  if ((order.paymentMethod || '').toLowerCase() !== 'cod') {
    return order.paymentStatus === PAYMENT_STATUS.PAID ? total : 0;
  }
  const entries = Array.isArray(order.codPayments) ? order.codPayments : [];
  return entries.reduce((sum, entry) => sum + toNumber(entry?.amount), 0);
};

const getPaymentSummary = (order) => {
  const totalAmount = getTotalAmount(order);
  const paidAmount = getPaidAmount(order);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  return {
    totalAmount,
    paidAmount,
    remainingAmount,
  };
};

const derivePaymentStatus = ({ totalAmount, paidAmount }) => {
  if (paidAmount <= 0) return PAYMENT_STATUS.PENDING;
  if (paidAmount < totalAmount) return PAYMENT_STATUS.PARTIALLY_PAID;
  return PAYMENT_STATUS.PAID;
};

const attachPaymentSummary = (order) => {
  if (!order) return order;
  const paymentSummary = getPaymentSummary(order);
  return {
    ...order,
    paymentSummary,
  };
};

module.exports = {
  getPaymentSummary,
  attachPaymentSummary,
  derivePaymentStatus,
};
