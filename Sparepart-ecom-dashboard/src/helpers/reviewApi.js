// API helper functions for review management
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API Error: ${response.statusText}`);
    }

    return response.json();
};

export const reviewAPI = {
    /**
     * List paginated reviews (Admin)
     * query: { page, limit, sort, etc. }
     */
    list: async (params = {}, token) => {
        const queryParams = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/reviews/admin?${queryParams}`;
        // Allow explicit token or fallback
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { headers });
    },

    /**
     * Get review details (Admin)
     */
    get: async (id, token) => {
        const url = `${API_BASE_URL}/reviews/admin/${id}`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { headers });
    },

    /**
     * Delete review
     */
    delete: async (id, token) => {
        const url = `${API_BASE_URL}/reviews/${id}`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, {
            method: 'DELETE',
            headers
        });
    },

    /**
     * Update review (Admin)
     */
    update: async (id, payload = {}, token) => {
        const url = `${API_BASE_URL}/reviews/${id}`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
        });
    }
};
