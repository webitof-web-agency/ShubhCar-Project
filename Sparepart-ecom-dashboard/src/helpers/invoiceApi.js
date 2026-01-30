const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

const fetchWithAuth = async (url, options = {}) => {
  const response = await fetch(url, options)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API Error: ${response.statusText}`)
  }
  return response.json()
}

export const invoiceAPI = {
  list: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/invoices${query ? `?${query}` : ''}`
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } })
  },
  get: async (id, token) => {
    const url = `${API_BASE_URL}/invoices/${id}`
    return fetchWithAuth(url, { headers: { Authorization: `Bearer ${token}` } })
  },
  getPdf: async (id, token, download = false) => {
    const url = `${API_BASE_URL}/invoices/${id}/pdf${download ? '?download=true' : ''}`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `API Error: ${response.statusText}`)
    }
    return response.blob()
  },
}
