// API helper functions for dashboard analytics
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

export const dashboardAPI = {
    /**
     * Get main dashboard stats (Revenue, Orders, etc.)
     */
    getStats: async (token) => {
        // Note: Assuming /analytics/dashboard endpoint exists based on routes.js /v1/analytics
        // If not, we might need to hit multiple endpoints or create a specific dashboard one.
        // For now pointing to a likely candidate.
        const url = `${API_BASE_URL}/analytics/dashboard`;
        return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
    },

    /**
     * Get sales/revenue chart data
     */
    getRevenueChart: async (token, params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${API_BASE_URL}/analytics/dashboard/chart?${query}` : `${API_BASE_URL}/analytics/dashboard/chart`;
        return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
    }
};
