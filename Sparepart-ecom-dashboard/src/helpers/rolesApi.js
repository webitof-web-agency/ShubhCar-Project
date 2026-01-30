const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

const fetchWithAuth = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API Error: ${response.statusText}`)
  }
  return response.json()
}

export const rolesAPI = {
  list: async (token) => {
    const url = `${API_BASE_URL}/roles`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  get: async (id, token) => {
    const url = `${API_BASE_URL}/roles/${id}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  create: async (data, token) => {
    const url = `${API_BASE_URL}/roles`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { method: 'POST', headers, body: JSON.stringify(data) })
  },

  update: async (id, data, token) => {
    const url = `${API_BASE_URL}/roles/${id}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { method: 'PUT', headers, body: JSON.stringify(data) })
  },

  remove: async (id, token) => {
    const url = `${API_BASE_URL}/roles/${id}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { method: 'DELETE', headers })
  },
}
