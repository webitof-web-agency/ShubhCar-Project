// API helper functions for settings management
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/**
 * Get authentication token from localStorage
 */
const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        const session = localStorage.getItem('session');
        // Note: Actual implementation depends on how token is stored. 
        // We usually use NextAuth session in components, but for helpers we might pass token.
        return localStorage.getItem('authToken') || '';
    }
    return '';
};

/**
 * Make authenticated API request
 */
const fetchWithAuth = async (url, options = {}) => {
    // If token passed in headers, use it, otherwise try local strict (but we prefer passing token)
    const headers = {
        'Content-Type': 'application/json',
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

export const settingsAPI = {
    /**
     * Get all settings (optionally filter by group)
     */
    list: async (group, token) => {
        const query = group ? `?group=${group}` : '';
        const url = `${API_BASE_URL}/settings${query}`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { headers });
    },

    /**
     * Update settings in bulk
     * data: { key: value }
     */
    update: async (data, token) => {
        const url = `${API_BASE_URL}/settings`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data),
        });
    }
};
