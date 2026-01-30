const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const fetchWithAuth = async (url, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
};

export const entriesAPI = {
    list: async (params = {}, token) => {
        const query = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/entries?${query}`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { headers });
    },

    get: async (id, token) => {
        const url = `${API_BASE_URL}/entries/${id}`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { headers });
    },

    delete: async (id, token) => {
        const url = `${API_BASE_URL}/entries/${id}`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { method: 'DELETE', headers });
    },

    markRead: async (id, token) => {
        const url = `${API_BASE_URL}/entries/${id}/read`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { method: 'PATCH', headers });
    },

    stats: async (token) => {
        const url = `${API_BASE_URL}/entries/stats`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { headers });
    }
};
