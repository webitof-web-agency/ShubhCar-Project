// API helper functions for payments
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

export const paymentAPI = {
    /**
     * List paginated payments (Admin)
     */
    list: async (params = {}, token) => {
        const queryParams = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/payments/admin/list?${queryParams}`;
        // Allow passing token explicitly or fallback to getAuthToken
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { headers });
    },
};
