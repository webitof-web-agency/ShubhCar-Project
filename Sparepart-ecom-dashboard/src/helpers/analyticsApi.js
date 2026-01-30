// API helper functions for analytics endpoints
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

export const analyticsAPI = {
  revenueSummary: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/revenue?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  userSummary: async (token) => {
    const url = `${API_BASE_URL}/analytics/users`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  topProducts: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/top-products?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  inventory: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/inventory?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  reviews: async (token) => {
    const url = `${API_BASE_URL}/analytics/reviews`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  revenueChart: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/dashboard/chart?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  salesByState: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/sales-by-state?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  salesByCity: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/sales-by-city?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  repeatCustomers: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/repeat-customers?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  fulfillment: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/fulfillment?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  funnel: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/funnel?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  topCategories: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/top-categories?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  topBrands: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/top-brands?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  inventoryTurnover: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/analytics/inventory-turnover?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },
}
