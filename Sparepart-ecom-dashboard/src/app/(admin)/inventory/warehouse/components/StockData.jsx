'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, CardTitle, Col, Row, Spinner } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { inventoryAPI } from '@/helpers/inventoryApi'

const StokeCard = ({ icon, item, title, change, active, onClick }) => {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
      className={active ? 'border-primary shadow-sm' : ''}
      style={{ cursor: 'pointer' }}
    >
      <CardBody>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <CardTitle as={'h4'} className="mb-2 d-flex align-items-center gap-2">
              {title}
            </CardTitle>
            <p className="text-muted fw-medium fs-22 mb-0">
              {item}&nbsp;
              {change ? (
                <>
                  <span className="badge text-danger bg-danger-subtle fs-12">
                    <IconifyIcon icon="bx:down-arrow-alt" />
                    4.5%
                  </span>{' '}
                  <span className="fs-12">(Last Week)</span>
                </>
              ) : (
                <span className="fs-12">(Items)</span>
              )}
            </p>
          </div>
          <div>
            <div className="avatar-md bg-primary bg-opacity-10 rounded flex-centered">
              <IconifyIcon width={32} height={32} icon={icon} className="fs-32 text-primary" />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
const StockData = ({ activeFilter, onFilterChange, refreshKey, lowStockThreshold = 10 }) => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!session?.accessToken) return
    const fetchSummary = async () => {
      try {
        const response = await inventoryAPI.summary(session.accessToken, { threshold: lowStockThreshold })
        setStats(response.data || response)
      } catch (error) {
        console.error('Failed to load inventory summary', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [session, refreshKey, lowStockThreshold])

  const cards = [
    {
      title: 'Total Products',
      item: stats?.totalProducts ?? 0,
      icon: 'solar:box-bold-duotone',
      filterKey: 'products',
    },
    {
      title: 'Total Stock',
      item: stats?.totalStock ?? 0,
      icon: 'solar:layers-bold-duotone',
      filterKey: 'stock',
    },
    {
      title: 'Low Stock',
      item: stats?.lowStockCount ?? 0,
      icon: 'solar:danger-circle-bold-duotone',
      filterKey: 'low',
    },
    {
      title: 'Out of Stock',
      item: stats?.outOfStockCount ?? 0,
      icon: 'solar:close-circle-bold-duotone',
      filterKey: 'out',
    },
  ]

  if (loading) {
    return (
      <Row>
        <Col className="text-center py-3">
          <Spinner animation="border" />
        </Col>
      </Row>
    )
  }

  return (
    <Row>
      {cards.map((item, idx) => (
        <Col md={6} xl={3} key={idx}>
          <StokeCard
            {...item}
            active={activeFilter === item.filterKey}
            onClick={() => onFilterChange?.(item.filterKey)}
          />
        </Col>
      ))}
    </Row>
  )
}
export default StockData
