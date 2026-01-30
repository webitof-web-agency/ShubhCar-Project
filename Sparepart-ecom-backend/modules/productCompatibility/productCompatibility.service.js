const repo = require('./productCompatibility.repo');
const { error } = require('../../utils/apiResponse');

class ProductCompatibilityService {
  async getByProduct(productId) {
    const doc = await repo.findByProduct(productId);
    if (!doc) {
      return { productId, vehicleIds: [] };
    }
    if (!Array.isArray(doc.vehicleIds) && Array.isArray(doc.fits)) {
      const vehicleIds = doc.fits
        .map((fit) => fit?.vehicleId)
        .filter(Boolean);
      if (vehicleIds.length) {
        const updated = await repo.upsert(productId, vehicleIds);
        return updated || { productId, vehicleIds };
      }
      return { productId, vehicleIds: [] };
    }
    return { productId, vehicleIds: doc.vehicleIds || [] };
  }

  async upsert(productId, payload) {
    if (!Array.isArray(payload.vehicleIds)) {
      error('vehicleIds must be an array', 400);
    }
    const normalized = payload.vehicleIds
      .map((id) => String(id))
      .filter(Boolean);
    const uniqueIds = Array.from(new Set(normalized));
    return repo.upsert(productId, uniqueIds);
  }
}

module.exports = new ProductCompatibilityService();
