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

export const taxAPI = {
  listSlabs: async (token) => {
    const url = `${API_BASE_URL}/tax/slabs`;
    return fetchWithAuth(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  createSlab: async (payload, token) => {
    const url = `${API_BASE_URL}/tax/slabs`;
    return fetchWithAuth(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },
  updateSlab: async (id, payload, token) => {
    const url = `${API_BASE_URL}/tax/slabs/${id}`;
    return fetchWithAuth(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },
  removeSlab: async (id, token) => {
    const url = `${API_BASE_URL}/tax/slabs/${id}`;
    return fetchWithAuth(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
