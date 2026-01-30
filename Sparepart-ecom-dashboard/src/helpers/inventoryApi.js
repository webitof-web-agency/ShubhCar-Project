const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

const fetchWithAuth = async (url, options = {}) => {
  const response = await fetch(url, options)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API Error: ${response.statusText}`)
  }
  return response.json()
}

export const inventoryAPI = {
  summary: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/inventory/summary${query ? `?${query}` : ''}`
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } })
  },
  listProducts: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/inventory/products${query ? `?${query}` : ''}`
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } })
  },
}
