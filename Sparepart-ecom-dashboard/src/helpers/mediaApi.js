// API helper functions for media management
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

export const mediaAPI = {
  presign: async (data, token) => {
    const url = `${API_BASE_URL}/media/presign`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { method: 'POST', headers, body: JSON.stringify(data) })
  },

  create: async (data, token) => {
    const url = `${API_BASE_URL}/media`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { method: 'POST', headers, body: JSON.stringify(data) })
  },

  upload: async (files, usedIn, token) => {
    const url = `${API_BASE_URL}/media/upload`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    if (usedIn) formData.append('usedIn', usedIn)
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `API Error: ${response.statusText}`)
    }
    return response.json()
  },

  list: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString()
    const url = `${API_BASE_URL}/media?${query}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { headers })
  },

  delete: async (id, token) => {
    const url = `${API_BASE_URL}/media/${id}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetchWithAuth(url, { method: 'DELETE', headers })
  },
}
