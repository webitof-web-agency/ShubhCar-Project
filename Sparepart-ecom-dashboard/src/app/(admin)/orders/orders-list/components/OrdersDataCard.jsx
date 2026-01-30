'use client'
import React, { useEffect, useState } from 'react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, CardTitle, Col, Row, Spinner } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import { orderAPI } from '@/helpers/orderApi'
import { DASHBOARD_STATUS_CARDS } from '@/constants/orderStatus'

const OrderCard = ({ icon, count, title, variant = 'primary' }) => {
  return (
    <Card>
      <CardBody>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <CardTitle as={'h4'} className="mb-2">
              {title}
            </CardTitle>
            <p className="text-muted fw-medium fs-22 mb-0">{count}</p>
          </div>
          <div>
            <div className={`avatar-md bg-${variant} bg-opacity-10 rounded flex-centered`}>
              <IconifyIcon height={32} width={32} icon={icon} className={`fs-32 text-${variant}`} />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

const OrdersDataCardPage = () => {
  const { data: session } = useSession()
  const [stats, setStats] = useState({ all: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatusCounts = async () => {
      if (session?.accessToken) {
        try {
          const response = await orderAPI.getStatusCounts(session.accessToken)
          if (response && response.data) {
            setStats(response.data)
          }
        } catch (error) {
          console.error("Failed to fetch order status counts", error)
        } finally {
          setLoading(false)
        }
      }
    }
    fetchStatusCounts()
  }, [session])

  if (loading) return <div className="py-3 text-center"><Spinner size="sm" /></div>

  const cards = DASHBOARD_STATUS_CARDS.map((card) => ({
    ...card,
    count: stats?.[card.status] || 0,
  }))

  return (
    <Row>
      {cards.map((item, idx) => (
        <Col md={6} xl={3} key={idx}>
          <OrderCard {...item} />
        </Col>
      ))}
    </Row>
  )
}
export default OrdersDataCardPage
