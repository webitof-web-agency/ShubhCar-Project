// Product API Service
// Centralized API calls for product CRUD operations

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const API_BASE_URL = RAW_API_URL.replace(/\/$/, '');
const API_PREFIX = API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL : `${API_BASE_URL}/api/v1`;

class ProductService {
  /**
   * Create a new product
   * @param {Object} productData - Product data to create
   * @param {string} token - Auth token
   * @returns {Promise} API response
   */
  async createProduct(productData, token) {
    const response = await fetch(`${API_PREFIX}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create product');
    }

    return response.json();
  }

  /**
   * Get all products (admin list)
   * @param {Object} query - Query parameters (page, limit, status, etc.)
   * @param {string} token - Auth token
   * @returns {Promise} API response
   */
  async getProducts(query = {}, token) {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params.set(key, String(value));
    });
    const response = await fetch(`${API_PREFIX}/products/admin/list?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch products');
    }

    return response.json();
  }

  /**
   * Get product by slug (public)
   * @param {string} slug - Product slug
   * @returns {Promise} API response
   */
  async getProductBySlug(slug) {
    const response = await fetch(`${API_PREFIX}/products/${slug}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch product');
    }

    return response.json();
  }

  /**
   * Update a product
   * @param {string} productId - Product ID
   * @param {Object} productData - Updated product data
   * @param {string} token - Auth token
   * @returns {Promise} API response
   */
  async updateProduct(productId, productData, token) {
    const response = await fetch(`${API_PREFIX}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update product');
    }

    return response.json();
  }

  /**
   * Delete a product (soft delete)
   * @param {string} productId - Product ID
   * @param {string} token - Auth token
   * @returns {Promise} API response
   */
  async deleteProduct(productId, token) {
    const response = await fetch(`${API_PREFIX}/products/${productId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete product');
    }

    return response.json();
  }

  /**
   * Approve a product (admin only)
   * @param {string} productId - Product ID
   * @param {string} token - Auth token
   * @returns {Promise} API response
   */
  async approveProduct(productId, token) {
    const response = await fetch(`${API_PREFIX}/products/admin/${productId}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to approve product');
    }

    return response.json();
  }

  async restoreProduct(productId, token) {
    const response = await fetch(`${API_PREFIX}/products/admin/${productId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error((await response.json()).message);
    return response.json();
  }

  async permanentDeleteProduct(productId, token) {
    const response = await fetch(`${API_PREFIX}/products/admin/${productId}/force-delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error((await response.json()).message);
    return response.json();
  }

  async emptyTrash(token) {
    const response = await fetch(`${API_PREFIX}/products/admin/empty-trash`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error((await response.json()).message);
    return response.json();
  }
}

export default new ProductService();
