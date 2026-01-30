// API helper functions for tags management
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

export const tagsAPI = {
    list: async (params = {}, token) => {
        const query = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/tags?${query}`;
        return fetch(url).then(res => res.json());
    },

    create: async (data, token) => {
        const url = `${API_BASE_URL}/tags`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { method: 'POST', headers, body: JSON.stringify(data) });
    },

    delete: async (id, token) => {
        const url = `${API_BASE_URL}/tags/${id}`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return fetchWithAuth(url, { method: 'DELETE', headers });
    }
};
