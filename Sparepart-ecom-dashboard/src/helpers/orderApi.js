// API helper functions for orders
import { getStatusBadge, getPaymentStatusBadge } from '@/constants/orderStatus';
import { API_BASE_URL } from '@/helpers/apiBase';

/**
 * Get authentication token from localStorage
 */
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || '';
  }
  return '';
};

/**
 * Make authenticated API request
 */
const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || `API Error: ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = errorBody;
    throw error;
  }

  return response.json();
};

/**
 * Order API functions
 */
export const orderAPI = {
  /**
   * List all orders with optional filters
   * @param {Object} params - Query parameters (status, page, limit)
   * @param {string} token - Authentication token
   */
  list: async (params = {}, token) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/orders${queryString ? `?${queryString}` : ''}`;
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
  },

  /**
   * Get counts of orders by status
   * @param {string} token - Authentication token
   */
  getStatusCounts: async (token) => {
    const url = `${API_BASE_URL}/orders/admin/counts`;
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
  },

  /**
   * Get full order details
   * @param {string} orderId - Order ID
   * @param {string} token - Authentication token
   */
  getOrderDetail: async (orderId, token) => {
    const url = `${API_BASE_URL}/orders/admin/${orderId}`;
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
  },

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @param {string} token - Authentication token
   */
  updateStatus: async (orderId, status, token) => {
    const url = `${API_BASE_URL}/orders/${orderId}/status`;
    return fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify({ status }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Update payment status (COD only)
   * @param {string} orderId - Order ID
   * @param {Object} payload - { status, amount, note }
   * @param {string} token - Authentication token
   */
  updatePaymentStatus: async (orderId, payload, token) => {
    const url = `${API_BASE_URL}/orders/${orderId}/payment-status`;
    return fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Get order history/events
   * @param {string} orderId - Order ID
   * @param {string} token - Authentication token
   */
  getOrderHistory: async (orderId, token) => {
    const url = `${API_BASE_URL}/orders/admin/${orderId}/history`;
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
  },

  /**
   * Get order notes
   * @param {string} orderId - Order ID
   * @param {string} token - Authentication token
   */
  getOrderNotes: async (orderId, token) => {
    const url = `${API_BASE_URL}/orders/admin/${orderId}/notes`;
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
  },

  /**
   * Add a note to an order
   * @param {string} orderId - Order ID
   * @param {Object} note - Note data
   * @param {string} token - Authentication token
   */
  addNote: async (orderId, note, token) => {
    const url = `${API_BASE_URL}/orders/admin/${orderId}/notes`;
    return fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(note),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Get invoice by order ID
   * @param {string} orderId - Order ID
   * @param {string} token - Authentication token
   */
  getInvoiceByOrder: async (orderId, token) => {
    const url = `${API_BASE_URL}/invoices/order/${orderId}`;
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
  },

  /**
   * Get invoice PDF by order ID
   */
  getInvoicePdfByOrder: async (orderId, token, download = false) => {
    const url = `${API_BASE_URL}/invoices/order/${orderId}/pdf${download ? '?download=true' : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${response.statusText}`);
    }
    return response.blob();
  },

  /**
   * Create shipment for an order item
   * @param {string} orderItemId - Order item ID
   * @param {Object} payload - Shipment payload
   * @param {string} token - Authentication token
   */
  createShipment: async (orderItemId, payload, token) => {
    const url = `${API_BASE_URL}/shipments/${orderItemId}`;
    return fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Update shipment status for an order item
   * @param {string} orderItemId - Order item ID
   * @param {Object} payload - Shipment update payload
   * @param {string} token - Authentication token
   */
  updateShipmentStatus: async (orderItemId, payload, token) => {
    const url = `${API_BASE_URL}/shipments/${orderItemId}/status`;
    return fetchWithAuth(url, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Create an order manually (Admin)
   * @param {Object} payload - Order payload
   * @param {string} token - Authentication token
   */
  createManual: async (payload, token) => {
    const url = `${API_BASE_URL}/orders/admin/create`;
    return fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

/**
 * Get status badge configuration
 * Maps order status to Bootstrap badge variant and display text
 */
export { getStatusBadge, getPaymentStatusBadge };
