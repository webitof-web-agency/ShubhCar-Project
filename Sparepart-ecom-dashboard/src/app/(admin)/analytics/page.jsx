'use client'

import PageTItle from '@/components/PageTItle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { analyticsAPI } from '@/helpers/analyticsApi'
import { currency } from '@/context/constants'
import ReactApexChart from 'react-apexcharts'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row, Spinner, Table, Button, Form } from 'react-bootstrap'

const formatDate = (date) => date.toISOString().split('T')[0]
const toStartOfDay = (value) => {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}
const toEndOfDay = (value) => {
  const d = new Date(value)
  d.setHours(23, 59, 59, 999)
  return d
}

const AnalyticsPage = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [revenue, setRevenue] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    paidOrders: 0,
    pendingOrders: 0,
    pendingRevenue: 0,
    cancelRate: 0,
    refundRate: 0,
    paymentSplit: [],
  })
  const [users, setUsers] = useState({ totalUsers: 0, wholesaleUsers: 0 })
  const [reviews, setReviews] = useState({ totalReviews: 0, averageRating: 0 })
  const [topProducts, setTopProducts] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [chartData, setChartData] = useState({ labels: [], revenue: [], orders: [] })
  const [repeatSummary, setRepeatSummary] = useState({
    repeatRate: 0,
    averageLtv: 0,
    averageOrdersPerCustomer: 0,
  })
  const [fulfillment, setFulfillment] = useState({
    avgHoursToShip: 0,
    avgHoursToDeliver: 0,
    shipmentsCount: 0,
    deliveriesCount: 0,
  })
  const [funnel, setFunnel] = useState({
    placed: 0,
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  })
  const [salesByState, setSalesByState] = useState([])
  const [salesByCity, setSalesByCity] = useState([])
  const [topCategories, setTopCategories] = useState([])
  const [topBrands, setTopBrands] = useState([])
  const [inventoryTurnover, setInventoryTurnover] = useState({
    turnoverRate: 0,
    totalSoldQty: 0,
    totalStockQty: 0,
    deadStock: [],
  })

  const rangeParams = useMemo(() => {
    const now = new Date()
    if (range === 'custom') {
      if (!customFrom || !customTo) return null
      const fromDate = toStartOfDay(customFrom)
      const toDate = toEndOfDay(customTo)
      return { from: fromDate.toISOString(), to: toDate.toISOString() }
    }

    let start = new Date(now)
    if (range === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (range === 'week') {
      start.setDate(start.getDate() - 6)
    } else {
      start.setDate(start.getDate() - 29)
    }

    const fromDate = toStartOfDay(start)
    const toDate = toEndOfDay(now)
    return { from: fromDate.toISOString(), to: toDate.toISOString() }
  }, [range, customFrom, customTo])

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }

      if (range === 'custom' && !rangeParams) {
        setLoading(false)
        return
      }

      setLoading(true)
      const queryParams = rangeParams || {}

      try {
        const [
          revenueResponse,
          usersResponse,
          reviewsResponse,
          topProductsResponse,
          inventoryResponse,
          chartResponse,
          repeatResponse,
          fulfillmentResponse,
          funnelResponse,
          salesStateResponse,
          salesCityResponse,
          topCategoriesResponse,
          topBrandsResponse,
          inventoryTurnoverResponse,
        ] = await Promise.all([
          analyticsAPI.revenueSummary(queryParams, session.accessToken),
          analyticsAPI.userSummary(session.accessToken),
          analyticsAPI.reviews(session.accessToken),
          analyticsAPI.topProducts({ limit: 8, ...queryParams }, session.accessToken),
          analyticsAPI.inventory({ threshold: 8 }, session.accessToken),
          analyticsAPI.revenueChart({ range: range === 'custom' ? 'custom' : range, ...queryParams }, session.accessToken),
          analyticsAPI.repeatCustomers(queryParams, session.accessToken),
          analyticsAPI.fulfillment(queryParams, session.accessToken),
          analyticsAPI.funnel(queryParams, session.accessToken),
          analyticsAPI.salesByState({ limit: 6, ...queryParams }, session.accessToken),
          analyticsAPI.salesByCity({ limit: 6, ...queryParams }, session.accessToken),
          analyticsAPI.topCategories({ limit: 6, ...queryParams }, session.accessToken),
          analyticsAPI.topBrands({ limit: 6, ...queryParams }, session.accessToken),
          analyticsAPI.inventoryTurnover({ limit: 6, ...queryParams }, session.accessToken),
        ])

        setRevenue(revenueResponse.data || {})
        setUsers(usersResponse.data || {})
        setReviews(reviewsResponse.data || {})
        setTopProducts(topProductsResponse.data || [])
        setLowStock(inventoryResponse.data || [])
        setChartData(chartResponse.data || { labels: [], revenue: [], orders: [] })
        setRepeatSummary(repeatResponse.data || {})
        setFulfillment(fulfillmentResponse.data || {})
        setFunnel(funnelResponse.data || {})
        setSalesByState(salesStateResponse.data || [])
        setSalesByCity(salesCityResponse.data || [])
        setTopCategories(topCategoriesResponse.data || [])
        setTopBrands(topBrandsResponse.data || [])
        setInventoryTurnover(inventoryTurnoverResponse.data || {})
      } catch (error) {
        console.error('Failed to fetch analytics', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [session, range, rangeParams])

  const chartOptions = useMemo(
    () => ({
      chart: { height: 320, type: 'line', toolbar: { show: false } },
      stroke: { width: [2, 3], curve: 'smooth', dashArray: [0, 8] },
      colors: ['#1f5eff', '#1aa36f'],
      series: [
        { name: 'Orders', type: 'bar', data: chartData.orders || [] },
        { name: 'Revenue', type: 'line', data: chartData.revenue || [] },
      ],
      fill: {
        opacity: [0.85, 0.25, 1],
        gradient: {
          inverseColors: false,
          shade: 'light',
          type: 'vertical',
          opacityFrom: 0.85,
          opacityTo: 0.55,
          stops: [0, 100, 100, 100],
        },
      },
      labels: chartData.labels || [],
      markers: { size: 0 },
      xaxis: { type: 'category', categories: chartData.labels || [] },
      yaxis: [
        { title: { text: 'Orders' } },
        { opposite: true, title: { text: 'Revenue' } },
      ],
      tooltip: { shared: true, intersect: false },
      grid: { borderColor: '#f1f3fa' },
      legend: { offsetY: 7 },
    }),
    [chartData]
  )

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>

  return (
    <>
      <PageTItle title="ANALYTICS" />
      <Row className="g-3 align-items-center mb-3">
        <Col xl={8} className="d-flex flex-wrap gap-2">
          {['today', 'week', 'month', 'custom'].map((key) => (
            <Button
              key={key}
              variant={range === key ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setRange(key)}
            >
              {key === 'today' ? 'Today' : key === 'week' ? 'Week' : key === 'month' ? 'Month' : 'Custom'}
            </Button>
          ))}
        </Col>
        <Col xl={4} className="d-flex align-items-center gap-2 justify-content-xl-end flex-wrap flex-xl-nowrap">
          <Form.Control
            type="date"
            size="sm"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            disabled={range !== 'custom'}
            className="w-auto"
            style={{ minWidth: 170 }}
          />
          <Form.Control
            type="date"
            size="sm"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            disabled={range !== 'custom'}
            className="w-auto"
            style={{ minWidth: 170 }}
          />
        </Col>
      </Row>

      <Row className="g-3">
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardBody>
              <div className="d-flex align-items-center gap-3">
                <div className="avatar-md bg-soft-primary rounded flex-centered">
                  <IconifyIcon icon="solar:wallet-money-bold-duotone" className="fs-24 text-primary" />
                </div>
                <div>
                  <p className="text-muted mb-0">Total Revenue</p>
                  <h4 className="mb-0">{currency}{Number(revenue.totalRevenue || 0).toLocaleString()}</h4>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardBody>
              <div className="d-flex align-items-center gap-3">
                <div className="avatar-md bg-soft-success rounded flex-centered">
                  <IconifyIcon icon="solar:cart-4-bold-duotone" className="fs-24 text-success" />
                </div>
                <div>
                  <p className="text-muted mb-0">Total Orders</p>
                  <h4 className="mb-0">{Number(revenue.totalOrders || 0).toLocaleString()}</h4>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardBody>
              <div className="d-flex align-items-center gap-3">
                <div className="avatar-md bg-soft-info rounded flex-centered">
                  <IconifyIcon icon="solar:user-bold-duotone" className="fs-24 text-info" />
                </div>
                <div>
                  <p className="text-muted mb-0">Total Customers</p>
                  <h4 className="mb-0">{Number(users.totalUsers || 0).toLocaleString()}</h4>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardBody>
              <div className="d-flex align-items-center gap-3">
                <div className="avatar-md bg-soft-warning rounded flex-centered">
                  <IconifyIcon icon="solar:ticket-bold-duotone" className="fs-24 text-warning" />
                </div>
                <div>
                  <p className="text-muted mb-0">Avg Order Value</p>
                  <h4 className="mb-0">{currency}{Number(revenue.avgOrderValue || 0).toFixed(2)}</h4>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3 g-3">
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardBody>
              <p className="text-muted mb-1">Paid Orders</p>
              <h4 className="mb-1">{Number(revenue.paidOrders || 0).toLocaleString()}</h4>
              <p className="mb-0 text-muted">Revenue: {currency}{Number(revenue.totalRevenue || 0).toLocaleString()}</p>
            </CardBody>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardBody>
              <p className="text-muted mb-1">Pending Orders</p>
              <h4 className="mb-1">{Number(revenue.pendingOrders || 0).toLocaleString()}</h4>
              <p className="mb-0 text-muted">Value: {currency}{Number(revenue.pendingRevenue || 0).toLocaleString()}</p>
            </CardBody>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardBody>
              <p className="text-muted mb-1">Cancel Rate</p>
              <h4 className="mb-0">{Number(revenue.cancelRate || 0).toFixed(2)}%</h4>
            </CardBody>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="h-100">
            <CardBody>
              <p className="text-muted mb-1">Refund Rate</p>
              <h4 className="mb-0">{Number(revenue.refundRate || 0).toFixed(2)}%</h4>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3 g-3">
        <Col xl={8}>
          <Card className="h-100">
            <CardBody>
              <CardTitle as="h4">Orders vs Revenue</CardTitle>
              <div dir="ltr">
                <ReactApexChart options={chartOptions} series={chartOptions.series} height={320} type="line" className="apex-charts" />
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={4}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Payment Methods</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th className="text-end">Orders</th>
                      <th className="text-end">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(revenue.paymentSplit || []).map((row, idx) => (
                      <tr key={`${row._id}-${idx}`}>
                        <td>{row._id || 'Unknown'}</td>
                        <td className="text-end">{Number(row.orders || 0).toLocaleString()}</td>
                        <td className="text-end">{currency}{Number(row.revenue || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!revenue.paymentSplit || revenue.paymentSplit.length === 0) && (
                      <tr>
                        <td colSpan="3" className="text-center py-3">No payment data</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3 g-3">
        <Col xl={4}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Repeat Customers</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Repeat Rate</span>
                <span className="fw-semibold">{Number(repeatSummary.repeatRate || 0).toFixed(2)}%</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Avg Orders / Customer</span>
                <span className="fw-semibold">{Number(repeatSummary.averageOrdersPerCustomer || 0).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Average LTV</span>
                <span className="fw-semibold">{currency}{Number(repeatSummary.averageLtv || 0).toFixed(2)}</span>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={4}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Fulfillment Time</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Avg Hours to Ship</span>
                <span className="fw-semibold">{Number(fulfillment.avgHoursToShip || 0).toFixed(1)}h</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Avg Hours to Deliver</span>
                <span className="fw-semibold">{Number(fulfillment.avgHoursToDeliver || 0).toFixed(1)}h</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Shipments Count</span>
                <span className="fw-semibold">{Number(fulfillment.shipmentsCount || 0).toLocaleString()}</span>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={4}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Order Funnel</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Placed</span>
                <span className="fw-semibold">{Number(funnel.placed || 0).toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Paid</span>
                <span className="fw-semibold">{Number(funnel.paid || 0).toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Shipped</span>
                <span className="fw-semibold">{Number(funnel.shipped || 0).toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Delivered</span>
                <span className="fw-semibold">{Number(funnel.delivered || 0).toLocaleString()}</span>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3 g-3">
        <Col xl={6}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Sales by State</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0">
                  <thead>
                    <tr>
                      <th>State</th>
                      <th className="text-end">Orders</th>
                      <th className="text-end">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByState.map((item, idx) => (
                      <tr key={`${item.state}-${idx}`}>
                        <td>{item.state}</td>
                        <td className="text-end">{Number(item.orders || 0).toLocaleString()}</td>
                        <td className="text-end">{currency}{Number(item.revenue || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {salesByState.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center py-3">No state data</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={6}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Sales by City</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0">
                  <thead>
                    <tr>
                      <th>City</th>
                      <th className="text-end">Orders</th>
                      <th className="text-end">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByCity.map((item, idx) => (
                      <tr key={`${item.city}-${idx}`}>
                        <td>{item.city}</td>
                        <td className="text-end">{Number(item.orders || 0).toLocaleString()}</td>
                        <td className="text-end">{currency}{Number(item.revenue || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {salesByCity.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center py-3">No city data</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3 g-3">
        <Col xl={6}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Top Categories</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="text-end">Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCategories.map((item, idx) => (
                      <tr key={`${item.categoryId}-${idx}`}>
                        <td>{item.name}</td>
                        <td className="text-end">{Number(item.quantitySold || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {topCategories.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-3">No category data</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={6}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Top Brands</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th className="text-end">Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topBrands.map((item, idx) => (
                      <tr key={`${item.name}-${idx}`}>
                        <td>{item.name}</td>
                        <td className="text-end">{Number(item.quantitySold || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {topBrands.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-3">No brand data</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3 g-3">
        <Col xl={6}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Inventory Turnover</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Turnover Rate</span>
                <span className="fw-semibold">{Number(inventoryTurnover.turnoverRate || 0).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Total Sold Qty</span>
                <span className="fw-semibold">{Number(inventoryTurnover.totalSoldQty || 0).toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Total Stock Qty</span>
                <span className="fw-semibold">{Number(inventoryTurnover.totalStockQty || 0).toLocaleString()}</span>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={6}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Dead Stock</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th className="text-end">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inventoryTurnover.deadStock || []).map((item) => (
                      <tr key={item._id}>
                        <td>{item.name}</td>
                        <td>{item.sku || '-'}</td>
                        <td className="text-end">{Number(item.stockQty || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!inventoryTurnover.deadStock || inventoryTurnover.deadStock.length === 0) && (
                      <tr>
                        <td colSpan="3" className="text-center py-3">No dead stock</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3 g-3">
        <Col xl={6}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Top Products</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-end">Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((item, idx) => (
                      <tr key={`${item.productId}-${idx}`}>
                        <td>{item.name}</td>
                        <td className="text-end">{Number(item.quantitySold || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {topProducts.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-3">No top products yet</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={6}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th className="text-end">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((item) => (
                      <tr key={item._id}>
                        <td>{item.name || item.productName}</td>
                        <td>{item.sku || '-'}</td>
                        <td className="text-end">{Number(item.availableQty || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {lowStock.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center py-3">No low stock items</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3 g-3">
        <Col xl={4}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Customers & Reviews</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">Total Customers</span>
                <span className="fw-semibold">{Number(users.totalUsers || 0).toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">Wholesale Customers</span>
                <span className="fw-semibold">{Number(users.wholesaleUsers || 0).toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">Total Reviews</span>
                <span className="fw-semibold">{Number(reviews.totalReviews || 0).toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Average Rating</span>
                <span className="fw-semibold">{Number(reviews.averageRating || 0).toFixed(2)}</span>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={8}>
          <Card className="h-100">
            <CardHeader>
              <CardTitle as="h4">Order Status Summary</CardTitle>
            </CardHeader>
            <CardBody>
              <Row className="g-2">
                <Col md={4}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Cancelled</span>
                    <span className="fw-semibold">{Number(revenue.cancelledOrders || 0).toLocaleString()}</span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Refunded</span>
                    <span className="fw-semibold">{Number(revenue.refundedOrders || 0).toLocaleString()}</span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Pending Payment</span>
                    <span className="fw-semibold">{Number(revenue.pendingOrders || 0).toLocaleString()}</span>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AnalyticsPage
