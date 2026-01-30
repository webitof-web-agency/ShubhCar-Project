'use client'
import React, { useEffect, useState } from 'react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import { userAPI } from '@/helpers/userApi'

const CustomerCard = ({ change, icon, count, title, variant }) => {
  return (
    <Card>
      <CardBody>
        <div className="d-flex align-items-center gap-2 mb-3">
          <div className="avatar-md bg-primary bg-opacity-10 rounded flex-centered">
            <IconifyIcon icon={icon} width={32} height={32} className="fs-32 text-primary" />
          </div>
          <div>
            <h4 className="mb-0">{title}</h4>
          </div>
        </div>
        <div className="d-flex align-items-center justify-content-between">
          <p className="text-muted fw-medium fs-22 mb-0">{count}</p>
          <div>
            {/* <span className={`badge text-${variant ? 'danger' : 'success'} bg-${variant ? 'danger' : 'success'}-subtle fs-12`}>
              {variant ? <IconifyIcon icon="bx:down-arrow-alt" /> : <IconifyIcon icon="bx:up-arrow-alt" />}
              {change}%
            </span> */}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

const CustomerDataCard = () => {
  const { data: session } = useSession()
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    new: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (session?.accessToken) {
        try {
          const response = await userAPI.getStats(session.accessToken)
          if (response && response.data) {
            setStats(response.data)
          }
        } catch (error) {
          console.error("Failed to fetch customer stats", error)
        } finally {
          setLoading(false)
        }
      }
    }
    fetchStats()
  }, [session])

  if (loading) return <div className="py-3 text-center"><Spinner size="sm" /></div>

  const cards = [
    { title: 'Total Customers', count: stats.total || 0, icon: 'solar:users-group-two-rounded-broken', variant: 'success' },
    { title: 'Active Customers', count: stats.active || 0, icon: 'solar:user-check-rounded-broken', variant: 'success' },
    { title: 'New Customers (30d)', count: stats.new || 0, icon: 'solar:user-plus-rounded-broken', variant: 'primary' },
    { title: 'Inactive Customers', count: stats.inactive || 0, icon: 'solar:user-block-rounded-broken', variant: 'danger' },
  ]

  return (
    <Row>
      {cards.map((item, idx) => (
        <Col md={6} xl={3} key={idx}>
          <CustomerCard {...item} />
        </Col>
      ))}
    </Row>
  )
}
export default CustomerDataCard
