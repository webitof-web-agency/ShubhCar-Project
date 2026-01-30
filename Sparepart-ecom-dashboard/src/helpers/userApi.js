// API helper functions for users/customers
import { API_BASE_URL } from '@/helpers/apiBase';

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

export const userAPI = {
    /**
     * List all users (customers)
     */
    list: async (params = {}, token) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/users?${queryString}`;
        return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
    },

    /**
     * List all users (admin)
     */
    adminList: async (params = {}, token) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/users/admin?${queryString}`;
        return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
    },

    /**
     * Register a new customer
     */
    register: async (userData) => {
        const url = `${API_BASE_URL}/users/register`;
        return fetchWithAuth(url, {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    /**
     * Get user details
     */
    getById: async (id, token) => {
        const url = `${API_BASE_URL}/users/${id}`;
        return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
    },

    /**
     * Get user details (admin)
     */
    adminGetById: async (id, token) => {
        const url = `${API_BASE_URL}/users/admin/${id}`;
        const response = await fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
        return response.data || response.user || null;
    },



    /**
     * Create a new user (admin only)
     */
    create: async (userData, token) => {
        const url = `${API_BASE_URL}/users`;
        return fetchWithAuth(url, {
            method: 'POST',
            body: JSON.stringify(userData),
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    /**
     * Update user
     */
    update: async (id, userData, token) => {
        const url = `${API_BASE_URL}/users/${id}`;
        return fetchWithAuth(url, {
            method: 'PATCH',
            body: JSON.stringify(userData),
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    /**
     * Delete user
     */
    delete: async (id, token) => {
        const url = `${API_BASE_URL}/users/${id}`;
        return fetchWithAuth(url, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    /**
     * Get user statistics (admin only)
     */
    getStats: async (token) => {
        const url = `${API_BASE_URL}/users/admin/counts`;
        return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
    }
};
