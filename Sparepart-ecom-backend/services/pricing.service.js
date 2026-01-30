class PricingService {
  resolveUnitPrice({ product, customerType }) {
    if (!product) return 0;

    if (customerType === 'wholesale' && product.wholesalePrice) {
      return product.wholesalePrice.salePrice ?? product.wholesalePrice.mrp ?? 0;
    }

    return product.retailPrice?.salePrice ?? product.retailPrice?.mrp ?? 0;
  }
}

module.exports = new PricingService();
