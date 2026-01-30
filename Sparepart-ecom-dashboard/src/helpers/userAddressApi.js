// API helper functions for user addresses
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const fetchWithAuth = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.statusText}`);
  }

  return response.json();
};

export const userAddressAPI = {
  adminListByUser: async (userId, token) => {
    const url = `${API_BASE_URL}/user-addresses/admin/${userId}`;
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } });
  },
};
