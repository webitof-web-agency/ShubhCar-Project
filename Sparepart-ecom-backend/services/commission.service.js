class CommissionService {
  /**
   * For now: flat 10%
   * Later: category/vendor slabs
   */
  calculatePlatformCommission(amount) {
    return Math.round(amount * 0.1);
  }

  /**
   * Groups order items vendor-wise
   */
  buildVendorSplits(orderItems) {
    const map = {};

    for (const item of orderItems) {
      if (!item.vendorId) {
        continue;
      }
      if (!map[item.vendorId]) {
        map[item.vendorId] = {
          vendorId: item.vendorId,
          itemSubtotal: 0,
          taxAmount: 0,
          shippingShare: 0,
        };
      }

      map[item.vendorId].itemSubtotal += item.total;
    }

    return Object.values(map);
  }
}

module.exports = new CommissionService();
