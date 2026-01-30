'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL } from '@/helpers/apiBase'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, Col, Row, Alert, Spinner } from 'react-bootstrap'


const StatsCard = ({ title, value, icon, variant }) => {
  return (
    <Col md={4} className="mb-3">
      <Card className="h-100 overflow-hidden">
        <CardBody>
          <div className="d-flex align-items-center">
            <div className={`avatar-md bg-soft-${variant} rounded flex-centered me-3`}>
              <IconifyIcon icon={icon} className={`fs-24 text-${variant}`} />
            </div>
            <div>
              <p className="text-muted mb-0 text-truncate">{title}</p>
              <h3 className="text-dark mt-1 mb-0">{value}</h3>
            </div>
          </div>
        </CardBody>
      </Card>
    </Col>
  )
}

const AnalyticsStats = () => {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    revenue: 0,
    users: 0,
    topProducts: [],
    lowStock: [],
    reviews: 0,
  })

  useEffect(() => {
    const fetchAnalytics = async () => {
      // console.log('Session Status:', status)
      // console.log('Session Object:', session)

      if (status === 'loading') return // Wait for session to load

      const token = session?.accessToken || session?.user?.accessToken // Try both paths just in case

      if (!token) {
        if (status === 'authenticated') {
          setError('Authenticated but no access token found.')
        }
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }

        // Fetch all stats in parallel
        const [revenueRes, usersRes, productsRes, inventoryRes, reviewsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/analytics/revenue`, { headers }),
          fetch(`${API_BASE_URL}/analytics/users`, { headers }),
          fetch(`${API_BASE_URL}/analytics/top-products`, { headers }),
          fetch(`${API_BASE_URL}/analytics/inventory`, { headers }),
          fetch(`${API_BASE_URL}/analytics/reviews`, { headers }),
        ])

        if (!revenueRes.ok) throw new Error('Failed to fetch analytics')

        const revenueData = await revenueRes.json()
        const usersData = await usersRes.json()
        const productsData = await productsRes.json()
        const inventoryData = await inventoryRes.json()
        const reviewsData = await reviewsRes.json()

        setStats({
          revenue: revenueData.data?.totalRevenue || 0,
          users: usersData.data?.totalUsers || 0,
          orders: revenueData.data?.totalOrders || 0,
          products: productsData.data?.length || 0,
          lowStockCount: inventoryData.data?.length || 0,
          reviews: reviewsData.data?.totalReviews || 0,
        })
        setError(null)
      } catch (err) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [session, status]) // Depend on status too

  if (status === 'loading' || (loading && session)) return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>

  if (status === 'unauthenticated') return <Alert variant="warning">Please log in to view analytics.</Alert>

  if (error) return <Alert variant="danger">Error loading analytics: {error}</Alert>

  return (
    <Row>
      <StatsCard title="Total Revenue" value={`$${stats.revenue.toLocaleString()}`} icon="solar:wallet-money-bold-duotone" variant="success" />
      <StatsCard title="Total Users" value={stats.users} icon="solar:users-group-rounded-bold-duotone" variant="info" />
      <StatsCard title="Total Orders" value={stats.orders} icon="solar:bag-smile-bold-duotone" variant="warning" />
      <StatsCard title="Low Stock Items" value={stats.lowStockCount} icon="solar:box-minimalistic-bold-duotone" variant="danger" />
      <StatsCard title="Total Reviews" value={stats.reviews} icon="solar:star-bold-duotone" variant="primary" />
    </Row>
  )
}

export default AnalyticsStats
