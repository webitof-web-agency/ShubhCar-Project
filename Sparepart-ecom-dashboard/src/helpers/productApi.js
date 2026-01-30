// API helper functions for products
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('authToken') || '';
    }
    return '';
};

const fetchWithAuth = async (url, options = {}) => {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API Error: ${response.statusText}`);
    }

    return response.json();
};

export const productAPI = {
    /**
     * List all products
     */
    list: async (params = {}, token) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/products?${queryString}`;
        return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
    },

    /**
     * List all products (admin)
     */
    adminList: async (params = {}, token) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/products/admin/list?${queryString}`;
        return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
    },

    /**
     * Get product details
     */
    getById: async (id, token) => {
        const url = `${API_BASE_URL}/products/${id}`;
        return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
    },

    /**
     * Create product
     */
    create: async (productData, token) => {
        const url = `${API_BASE_URL}/products`;
        return fetchWithAuth(url, {
            method: 'POST',
            body: JSON.stringify(productData),
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    /**
     * Update product
     */
    update: async (id, productData, token) => {
        const url = `${API_BASE_URL}/products/${id}`;
        return fetchWithAuth(url, {
            method: 'PATCH',
            body: JSON.stringify(productData),
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    /**
     * Delete product
     */
    delete: async (id, token) => {
        const url = `${API_BASE_URL}/products/${id}`;
        return fetchWithAuth(url, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};
