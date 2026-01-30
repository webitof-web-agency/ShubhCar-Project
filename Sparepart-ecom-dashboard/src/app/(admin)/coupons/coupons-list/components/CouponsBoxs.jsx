'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'

const CouponsBoxs = ({ coupons = [], loading = false }) => {
  // Calculate stats from props
  const now = new Date()
  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.isActive && new Date(c.validTo) >= now).length,
    expired: coupons.filter(c => new Date(c.validTo) < now).length,
    inactive: coupons.filter(c => !c.isActive).length,
  }

  const statCards = [
    {
      title: 'Total Coupons',
      count: stats.total,
      icon: 'solar:ticket-bold',
      color: 'primary',
      bg: 'primary-subtle',
    },
    {
      title: 'Active Coupons',
      count: stats.active,
      icon: 'solar:check-circle-bold',
      color: 'success',
      bg: 'success-subtle',
    },
    {
      title: 'Expired',
      count: stats.expired,
      icon: 'solar:close-circle-bold',
      color: 'danger',
      bg: 'danger-subtle',
    },
    {
      title: 'Inactive',
      count: stats.inactive,
      icon: 'solar:pause-circle-bold',
      color: 'warning',
      bg: 'warning-subtle',
    },
  ]

  return (
    <Row>
      {statCards.map((card, idx) => (
        <Col md={6} xl={3} key={idx}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-center gap-2">
                <div className={`avatar-md flex-shrink-0 bg-${card.bg} d-flex align-items-center justify-content-center rounded-2`}>
                  <IconifyIcon icon={card.icon} className={`fs-32 text-${card.color}`} />
                </div>
                <div>
                  <h4 className="mb-1">
                    {loading ? <Spinner size="sm" /> : card.count}
                  </h4>
                  <p className="text-muted mb-0 fs-14">{card.title}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      ))}
    </Row>
  )
}

export default CouponsBoxs
