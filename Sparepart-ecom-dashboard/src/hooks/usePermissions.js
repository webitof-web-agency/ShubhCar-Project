'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { rolesAPI } from '@/helpers/rolesApi'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

const fetchWithAuth = async (url, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const response = await fetch(url, { headers })
  if (!response.ok) return null
  return response.json()
}

export const usePermissions = () => {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (status !== 'authenticated') {
        setPermissions([])
        setLoading(false)
        return
      }

      const token = session?.accessToken
      if (!token) {
        setPermissions([])
        setLoading(false)
        return
      }

      try {
        const meResponse = await fetchWithAuth(`${API_BASE_URL}/users/me`, token)
        const me = meResponse?.data || meResponse
        if (!me || me.role !== 'admin') {
          setPermissions([])
          setLoading(false)
          return
        }

        if (!me.roleId) {
          setPermissions(['*'])
          setLoading(false)
          return
        }

        const roleResponse = await rolesAPI.get(me.roleId, token)
        const role = roleResponse?.data || roleResponse
        const rolePermissions = Array.isArray(role?.permissions) ? role.permissions : []
        const expanded = new Set(rolePermissions)
        const legacyMap = {
          'products.manage': ['products.view', 'products.create', 'products.update', 'products.delete'],
          'users.manage': ['users.view', 'users.create', 'users.update', 'users.delete'],
          'roles.manage': ['roles.view', 'roles.create', 'roles.update', 'roles.delete'],
          'settings.manage': ['settings.view', 'settings.update'],
        }
        rolePermissions.forEach((perm) => {
          const mapped = legacyMap[perm]
          if (mapped) {
            mapped.forEach((item) => expanded.add(item))
          }
        })
        setPermissions(Array.from(expanded))
      } catch (error) {
        console.error('Failed to load permissions', error)
        setPermissions([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [session, status])

  const hasPermission = useMemo(() => {
    return (key) => {
      if (!key) return true
      if (permissions.includes('*')) return true
      return permissions.includes(key)
    }
  }, [permissions])

  return { permissions, loading, hasPermission }
}
