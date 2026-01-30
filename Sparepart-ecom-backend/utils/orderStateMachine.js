const { ORDER_STATUS } = require('../constants/orderStatus');
const { error } = require('./apiResponse');
 

const TRANSITIONS = {
  [ORDER_STATUS.CREATED]: [
    ORDER_STATUS.PENDING_PAYMENT,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.ON_HOLD,
  ],

  [ORDER_STATUS.PENDING_PAYMENT]: [
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.FAILED,
    ORDER_STATUS.ON_HOLD,
  ],

  [ORDER_STATUS.CONFIRMED]: [
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.REFUNDED,
    ORDER_STATUS.ON_HOLD,
  ],

  [ORDER_STATUS.SHIPPED]: [
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.RETURNED,
    ORDER_STATUS.ON_HOLD,
  ],

  [ORDER_STATUS.OUT_FOR_DELIVERY]: [
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.RETURNED,
    ORDER_STATUS.ON_HOLD,
  ],

  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.RETURNED],

  [ORDER_STATUS.RETURNED]: [ORDER_STATUS.REFUNDED],

  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.ON_HOLD]: [
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.FAILED]: [],
  [ORDER_STATUS.REFUNDED]: [],
};

module.exports = {
  canTransition(current, next) {
    if (current === next) return true;
    return (TRANSITIONS[current] || []).includes(next);
  },

  assertTransition(current, next) {
    if (!this.canTransition(current, next)) {
      error(
        `Invalid status transition from ${current} → ${next}`,
        400,
        'INVALID_ORDER_STATE',
      );
    }
  },
};
