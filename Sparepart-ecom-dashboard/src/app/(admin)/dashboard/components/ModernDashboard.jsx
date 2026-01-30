'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { analyticsAPI } from '@/helpers/analyticsApi'
import { dashboardAPI } from '@/helpers/dashboardApi'
import { orderAPI, getPaymentStatusBadge } from '@/helpers/orderApi'
import { DASHBOARD_STATUS_CARDS } from '@/constants/orderStatus'
import { currency } from '@/context/constants'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Placeholder, Row, Table } from 'react-bootstrap'
import { useRouter } from 'next/navigation'

const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <div className="chart-skeleton" />,
})

const ModernDashboard = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState({
    stats: true,
    statusCounts: true,
    chart: true,
    topProducts: true,
    orders: true,
    states: true,
  })
  const [stats, setStats] = useState({
    totalOrders: 0,
    newLeads: 0,
    revenue: 0,
    revenueChange: 0,
    ordersChange: 0,
    leadsChange: 0,
  })
  const [chartData, setChartData] = useState({ labels: [], revenue: [], orders: [] })
  const [topProducts, setTopProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [statusCounts, setStatusCounts] = useState({})
  const [salesByState, setSalesByState] = useState([])
  const [chartRange, setChartRange] = useState('month')
  const [ordersSearch, setOrdersSearch] = useState('')

  useEffect(() => {
    const token = session?.accessToken
    if (!token) {
      setLoading((prev) => ({ ...prev, stats: false, statusCounts: false, topProducts: false, orders: false, states: false }))
      return
    }

    const fetchCritical = async () => {
      try {
        const [statsResponse, statusResponse] = await Promise.all([
          dashboardAPI.getStats(token),
          orderAPI.getStatusCounts(token),
        ])
        setStats(statsResponse.data || {})
        setStatusCounts(statusResponse.data || {})
      } catch (error) {
        console.error('Failed to load dashboard', error)
      } finally {
        setLoading((prev) => ({ ...prev, stats: false, statusCounts: false }))
      }
    }

    const fetchNonCritical = async () => {
      try {
        const [productsResponse, ordersResponse, stateResponse] = await Promise.all([
          analyticsAPI.topProducts({ limit: 5 }, token),
          orderAPI.list({ limit: 5, summary: true }, token),
          analyticsAPI.salesByState({ limit: 5 }, token),
        ])
        setTopProducts(productsResponse.data || [])
        const ordersPayload = ordersResponse.data || []
        setOrders(Array.isArray(ordersPayload) ? ordersPayload : (ordersPayload.items || []))
        setSalesByState(stateResponse.data || [])
      } catch (error) {
        console.error('Failed to load dashboard details', error)
      } finally {
        setLoading((prev) => ({ ...prev, topProducts: false, orders: false, states: false }))
      }
    }

    fetchCritical().finally(() => {
      setTimeout(fetchNonCritical, 0)
    })
  }, [session])

  useEffect(() => {
    const token = session?.accessToken
    if (!token) {
      setLoading((prev) => ({ ...prev, chart: false }))
      return
    }

    const fetchChart = async () => {
      setLoading((prev) => ({ ...prev, chart: true }))
      try {
        const chartResponse = await dashboardAPI.getRevenueChart(token, { range: chartRange })
        setChartData(chartResponse.data || { labels: [], revenue: [], orders: [] })
      } catch (error) {
        console.error('Failed to load chart data', error)
      } finally {
        setLoading((prev) => ({ ...prev, chart: false }))
      }
    }

    fetchChart()
  }, [session, chartRange])

  const salesChartOptions = useMemo(
    () => ({
      chart: { height: 300, type: 'line', toolbar: { show: false } },
      stroke: { width: [3, 3], curve: 'smooth' },
      colors: ['#0f766e', '#f97316'],
      series: [
        { name: 'Revenue', data: chartData.revenue || [] },
        { name: 'Orders', data: chartData.orders || [] },
      ],
      xaxis: { categories: chartData.labels || [] },
      yaxis: [
        { labels: { formatter: (val) => `${currency}${val}` } },
        { opposite: true, labels: { formatter: (val) => `${val}` } },
      ],
      grid: { borderColor: 'rgba(148, 163, 184, 0.2)' },
      tooltip: { shared: true },
      legend: { position: 'top', horizontalAlign: 'right' },
    }),
    [chartData]
  )

  const totalChartRevenue = useMemo(
    () => (chartData.revenue || []).reduce((sum, value) => sum + Number(value || 0), 0),
    [chartData]
  )
  const totalChartOrders = useMemo(
    () => (chartData.orders || []).reduce((sum, value) => sum + Number(value || 0), 0),
    [chartData]
  )

  const conversionRate = stats.newLeads
    ? ((Number(stats.totalOrders || 0) / Number(stats.newLeads || 1)) * 100).toFixed(1)
    : '0.0'

  const orderStatusCards = DASHBOARD_STATUS_CARDS.map((card) => ({
    ...card,
    count: statusCounts?.[card.status] || 0,
  }))

  const filteredOrders = useMemo(() => {
    if (!ordersSearch.trim()) return orders
    const query = ordersSearch.trim().toLowerCase()
    return orders.filter((order) => {
      const orderNumber = order.orderNumber?.toLowerCase() || ''
      const customerName = order.userId ? `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.toLowerCase() : ''
      return orderNumber.includes(query) || customerName.includes(query)
    })
  }, [orders, ordersSearch])

  const KpiSkeleton = () => (
    <Card className="dashboard-kpi">
      <CardBody>
        <div className="placeholder-glow">
          <Placeholder xs={6} className="mb-2" />
          <Placeholder xs={4} className="mb-3" />
          <Placeholder xs={3} />
        </div>
      </CardBody>
    </Card>
  )

  const TableSkeleton = ({ rows = 5, cols = 4 }) => (
    <div className="table-responsive">
      <Table className="table-nowrap mb-0">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, idx) => (
              <th key={idx}>
                <Placeholder as="span" xs={6} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="placeholder-glow">
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx}>
                  <Placeholder xs={8} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )

  const ChartSkeleton = ({ height = 300 }) => (
    <div className="placeholder-glow" style={{ height }}>
      <Placeholder className="w-100 h-100" />
    </div>
  )

  return (
    <div className="dashboard-modern">
      <Row className="g-3 mb-3">
        {loading.stats ? (
          <>
            <Col md={3}><KpiSkeleton /></Col>
            <Col md={3}><KpiSkeleton /></Col>
            <Col md={3}><KpiSkeleton /></Col>
            <Col md={3}><KpiSkeleton /></Col>
          </>
        ) : (
          <>
            <Col md={3}>
              <Card className="dashboard-kpi">
                <CardBody>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="text-muted mb-1">Total Revenue</p>
                      <h3 className="mb-0">{currency}{Number(stats.revenue || 0).toLocaleString()}</h3>
                    </div>
                    <div className="kpi-icon bg-soft-primary text-primary">
                      <IconifyIcon icon="solar:wallet-money-bold-duotone" />
                    </div>
                  </div>
                  <div className="kpi-meta">
                    <span className={`badge bg-${stats.revenueChange >= 0 ? 'success' : 'danger'}`}>
                      {Math.abs(stats.revenueChange || 0).toFixed(1)}%
                    </span>
                    <span className="text-muted">vs last month</span>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="dashboard-kpi">
                <CardBody>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="text-muted mb-1">Total Orders</p>
                      <h3 className="mb-0">{Number(stats.totalOrders || 0).toLocaleString()}</h3>
                    </div>
                    <div className="kpi-icon bg-soft-success text-success">
                      <IconifyIcon icon="solar:cart-4-bold-duotone" />
                    </div>
                  </div>
                  <div className="kpi-meta">
                    <span className={`badge bg-${stats.ordersChange >= 0 ? 'success' : 'danger'}`}>
                      {Math.abs(stats.ordersChange || 0).toFixed(1)}%
                    </span>
                    <span className="text-muted">vs last month</span>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="dashboard-kpi">
                <CardBody>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="text-muted mb-1">New Leads</p>
                      <h3 className="mb-0">{Number(stats.newLeads || 0).toLocaleString()}</h3>
                    </div>
                    <div className="kpi-icon bg-soft-warning text-warning">
                      <IconifyIcon icon="solar:user-hand-up-bold-duotone" />
                    </div>
                  </div>
                  <div className="kpi-meta">
                    <span className={`badge bg-${stats.leadsChange >= 0 ? 'success' : 'danger'}`}>
                      {Math.abs(stats.leadsChange || 0).toFixed(1)}%
                    </span>
                    <span className="text-muted">vs last month</span>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="dashboard-kpi">
                <CardBody>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="text-muted mb-1">Conversion Rate</p>
                      <h3 className="mb-0">{conversionRate}%</h3>
                    </div>
                    <div className="kpi-icon bg-soft-info text-info">
                      <IconifyIcon icon="solar:chart-2-bold-duotone" />
                    </div>
                  </div>
                  <div className="kpi-meta">
                    <span className="text-muted">Orders vs leads</span>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Row className="g-3 mb-3">
        {loading.statusCounts
          ? orderStatusCards.map((item) => (
            <Col md={6} xl={3} key={item.title}>
              <KpiSkeleton />
            </Col>
          ))
          : orderStatusCards.map((item) => (
            <Col md={6} xl={3} key={item.title}>
              <Card
                className="dashboard-kpi"
                role="button"
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/orders/orders-list?status=${item.status}`)}
              >
                <CardBody>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="text-muted mb-1">{item.title}</p>
                      <h3 className="mb-0">{Number(item.count).toLocaleString()}</h3>
                    </div>
                    <div className={`kpi-icon bg-soft-${item.variant} text-${item.variant}`}>
                      <IconifyIcon icon={item.icon} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          ))}
      </Row>

      <Row className="g-3 align-items-stretch">
        <Col xl={7} className="d-flex">
          <Card className="dashboard-card flex-fill">
            <CardHeader className="dashboard-card-header">
              <CardTitle as="h4">Sales Report</CardTitle>
              <div className="d-flex gap-2">
                <Button size="sm" variant={chartRange === 'today' ? 'primary' : 'light'} onClick={() => setChartRange('today')}>Today</Button>
                <Button size="sm" variant={chartRange === 'week' ? 'primary' : 'light'} onClick={() => setChartRange('week')}>Week</Button>
                <Button size="sm" variant={chartRange === 'month' ? 'primary' : 'light'} onClick={() => setChartRange('month')}>Month</Button>
              </div>
            </CardHeader>
            <CardBody>
              <Row className="mb-3">
                <Col sm={6}>
                  <p className="text-muted mb-1">Average Income</p>
                  {loading.stats ? (
                    <div className="placeholder-glow">
                      <Placeholder xs={6} />
                    </div>
                  ) : (
                    <>
                      <h4 className="mb-0">{currency}{(totalChartOrders ? totalChartRevenue / totalChartOrders : totalChartRevenue).toLocaleString()}</h4>
                      <span className="text-muted small">Based on {totalChartOrders || 0} orders</span>
                    </>
                  )}
                </Col>
                <Col sm={6}>
                  <p className="text-muted mb-1">Average Expenses</p>
                  {loading.stats ? (
                    <div className="placeholder-glow">
                      <Placeholder xs={6} />
                    </div>
                  ) : (
                    <>
                      <h4 className="mb-0">{currency}0</h4>
                      <span className="text-muted small">No expense data</span>
                    </>
                  )}
                </Col>
              </Row>
              {loading.chart ? (
                <ChartSkeleton height={300} />
              ) : (
                <ReactApexChart options={salesChartOptions} series={salesChartOptions.series} height={300} type="line" className="apex-charts" />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={5} className="d-flex">
          <Card className="dashboard-card flex-fill h-100 w-100">
            <CardHeader className="dashboard-card-header">
              <CardTitle as="h4">Sales by State</CardTitle>
            </CardHeader>
            <CardBody className="pt-0 d-flex flex-column h-100 w-100">
              {loading.states ? (
                <div className="placeholder-glow">
                  <Placeholder xs={12} className="mb-2" />
                  <Placeholder xs={12} className="mb-2" />
                  <Placeholder xs={12} />
                </div>
              ) : (
                <>
                  {salesByState.map((item) => (
                    <div key={item.state} className="country-row">
                      <div className="d-flex align-items-center gap-2">
                        <span className="flag">IN</span>
                        <div>
                          <div className="fw-semibold text-capitalize">{item.state}</div>
                          <small className="text-muted">{Number(item.orders || 0).toLocaleString()} Orders</small>
                        </div>
                      </div>
                      <span className="small text-success">{currency}{Number(item.revenue || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  {salesByState.length === 0 && (
                    <div className="text-muted text-center py-3">No sales data yet</div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col xl={7} className="d-flex">
          <Card className="dashboard-card flex-fill">
            <CardHeader className="dashboard-card-header">
              <CardTitle as="h4">Recent Sales</CardTitle>
              <Form className="dashboard-search">
                <Form.Control
                  type="search"
                  placeholder="Search"
                  value={ordersSearch}
                  onChange={(event) => setOrdersSearch(event.target.value)}
                />
              </Form>
            </CardHeader>
            <CardBody className="p-0">
              {loading.orders ? (
                <TableSkeleton rows={5} cols={5} />
              ) : (
                <div className="table-responsive">
                  <Table hover className="table-nowrap mb-0">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const badge = getPaymentStatusBadge(order.paymentStatus)
                        return (
                          <tr
                            key={order._id}
                            role="button"
                            className="align-middle"
                            style={{ cursor: 'pointer' }}
                            onClick={() => router.push(`/orders/order-detail?id=${order._id}`)}
                          >
                            <td>#{order.orderNumber}</td>
                            <td>{order.userId ? `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() : 'Guest'}</td>
                            <td>{currency}{Number(order.grandTotal || 0).toLocaleString()}</td>
                            <td>{order.paymentMethod || '-'}</td>
                            <td>
                              <Badge bg={badge.bg} text={badge.textColor}>{badge.text}</Badge>
                            </td>
                          </tr>
                        )
                      })}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-muted">No recent orders</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={5} className="d-flex">
          <Card className="dashboard-card flex-fill">
            <CardHeader className="dashboard-card-header">
              <CardTitle as="h4">Top Selling Items</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {loading.topProducts ? (
                <TableSkeleton rows={5} cols={2} />
              ) : (
                <div className="table-responsive">
                  <Table hover className="table-nowrap mb-0">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-end">Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((item, idx) => (
                        <tr
                          key={`${item.productId}-${idx}`}
                          role="button"
                          style={{ cursor: 'pointer' }}
                          onClick={() => router.push(`/products/product-edit?id=${item.productId}`)}
                        >
                          <td>{item.name}</td>
                          <td className="text-end">{Number(item.quantitySold || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      {topProducts.length === 0 && (
                        <tr>
                          <td colSpan="2" className="text-center py-4 text-muted">No top products yet</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col xl={12}>
          <Card className="dashboard-card">
            <CardHeader className="dashboard-card-header">
              <CardTitle as="h4">Order Status</CardTitle>
            </CardHeader>
            <CardBody>
              {loading.statusCounts ? (
                <div className="placeholder-glow">
                  <Placeholder xs={12} className="mb-3" />
                  <Placeholder xs={12} className="mb-3" />
                  <Placeholder xs={12} />
                </div>
              ) : (
                <>
                  <div className="status-row">
                    <span>Pending</span>
                    <div className="progress">
                      <div className="progress-bar bg-warning" style={{ width: `${statusCounts.created ? (statusCounts.created / (statusCounts.all || 1)) * 100 : 0}%` }} />
                    </div>
                    <span>{statusCounts.created || 0}</span>
                  </div>
                  <div className="status-row">
                    <span>Shipped</span>
                    <div className="progress">
                      <div className="progress-bar bg-primary" style={{ width: `${statusCounts.shipped ? (statusCounts.shipped / (statusCounts.all || 1)) * 100 : 0}%` }} />
                    </div>
                    <span>{statusCounts.shipped || 0}</span>
                  </div>
                  <div className="status-row">
                    <span>Delivered</span>
                    <div className="progress">
                      <div className="progress-bar bg-success" style={{ width: `${statusCounts.delivered ? (statusCounts.delivered / (statusCounts.all || 1)) * 100 : 0}%` }} />
                    </div>
                    <span>{statusCounts.delivered || 0}</span>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ModernDashboard
