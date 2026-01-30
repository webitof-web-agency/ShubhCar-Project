'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'
import ReactApexChart from 'react-apexcharts'
import { Card, CardBody, CardFooter, CardTitle, Col, Row } from 'react-bootstrap'
// ... imports
import { dashboardAPI } from '@/helpers/dashboardApi'
import { currency } from '@/context/constants'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

const StatsCard = ({ amount, change, icon, name, variant }) => {
  return (
    <Col md={6}>
      <Card className="overflow-hidden">
        <CardBody>
          <Row>
            <Col xs={6}>
              <div className="avatar-md bg-soft-primary rounded  flex-centered">
                <IconifyIcon icon={icon} className=" fs-24 text-primary" />
              </div>
            </Col>
            <Col xs={6} className="text-end">
              <p className="text-muted mb-0 text-truncate">{name}</p>
              <h3 className="text-dark mt-1 mb-0">{amount}</h3>
            </Col>
          </Row>
        </CardBody>
        <CardFooter className="py-2 bg-light bg-opacity-50">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <span className={`text-${variant} icons-center`}>
                {variant == 'danger' ? (
                  <IconifyIcon icon="bxs:down-arrow" className="fs-12" />
                ) : (
                  <IconifyIcon icon="bxs:up-arrow" className="fs-12" />
                )}
                &nbsp;{change}%
              </span>
              <span className="text-muted ms-1 fs-12">Last Week</span>
            </div>
            <Link href="" className="text-reset fw-semibold fs-12">
              View More
            </Link>
          </div>
        </CardFooter>
      </Card>
    </Col>
  )
}

const Stats = () => {
  const { data: session } = useSession()
  const [stats, setStats] = useState([
    {
      icon: 'solar:cart-5-bold-duotone',
      name: 'Total Orders',
      amount: '...',
      variant: 'success',
      change: '0.0',
    },
    {
      icon: 'bx:award',
      name: 'New Leads',
      amount: '...',
      variant: 'success',
      change: '0.0',
    },
    {
      icon: 'bxs:backpack',
      name: 'Deals',
      amount: '...',
      variant: 'danger',
      change: '0.0',
    },
    {
      icon: 'bx:dollar-circle',
      name: 'Booked Revenue',
      amount: '...',
      variant: 'danger',
      change: '0.0',
    },
  ])

  const [chartData, setChartData] = useState({
    categories: [],
    revenue: [],
    orders: []
  })

  useEffect(() => {
    const fetchStats = async () => {
      if (session?.accessToken) {
        try {
          const response = await dashboardAPI.getStats(session.accessToken)
          if (response && response.data) {
            // ... existing stats logic ...
            const data = response.data;
            setStats([
              // ... existing mapping ...
              {
                icon: 'solar:cart-5-bold-duotone',
                name: 'Total Orders',
                amount: data.totalOrders?.toLocaleString() || '0',
                variant: data.ordersChange >= 0 ? 'success' : 'danger',
                change: Math.abs(data.ordersChange || 0).toFixed(1),
              },
              {
                icon: 'bx:award',
                name: 'New Leads',
                amount: data.newLeads?.toLocaleString() || '0',
                variant: data.leadsChange >= 0 ? 'success' : 'danger',
                change: Math.abs(data.leadsChange || 0).toFixed(1),
              },
              {
                icon: 'bxs:backpack',
                name: 'Deals',
                amount: data.deals?.toLocaleString() || '0',
                variant: data.dealsChange >= 0 ? 'success' : 'danger',
                change: Math.abs(data.dealsChange || 0).toFixed(1),
              },
              {
                icon: 'bx:dollar-circle',
                name: 'Booked Revenue',
                amount: `${currency}${(data.revenue || 0).toLocaleString()}`,
                variant: data.revenueChange >= 0 ? 'success' : 'danger',
                change: Math.abs(data.revenueChange || 0).toFixed(1),
              },
            ])
          }

          // CHART DATA FETCH
          const chartResponse = await dashboardAPI.getRevenueChart(session.accessToken)
          if (chartResponse && chartResponse.data) {
            setChartData({
              categories: chartResponse.data.labels || [],
              revenue: chartResponse.data.revenue || [],
              orders: chartResponse.data.orders || []
            })
          }

        } catch (error) {
          console.error('Failed to fetch dashboard stats', error)
        }
      }
    }
    fetchStats()
  }, [session])

  const chartOptions = {
    chart: {
      height: 313,
      type: 'line',
      toolbar: { show: false },
    },
    stroke: {
      width: [2, 3],
      curve: 'smooth',
      dashArray: [0, 8],
    },
    plotOptions: {
      bar: {
        columnWidth: '50%',
      },
    },
    colors: ['#3e60d5', '#47ad77'],
    series: [
      {
        name: 'Orders',
        type: 'bar',
        data: chartData.orders,
      },
      {
        name: 'Revenue',
        type: 'line',
        data: chartData.revenue,
      },
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
    labels: chartData.categories,
    markers: {
      size: 0,
    },
    xaxis: {
      type: 'category',
      categories: chartData.categories,
      tooltip: {
        enabled: false,
      },
    },
    yaxis: [
      {
        title: {
          text: 'Orders',
        },
      },
      {
        opposite: true,
        title: {
          text: 'Revenue',
        },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
    },
    grid: {
      borderColor: '#f1f3fa',
    },
    legend: {
      offsetY: 7,
    },
  }

  return (
    <>
      <Col xxl={5}>
        <Row>
          {/* Removed Server Error Alert for cleaner UI */}
          {stats.map((item, idx) => (
            <StatsCard key={idx} {...item} />
          ))}
        </Row>
      </Col>

      <Col xxl={7}>
        <Card>
          <CardBody>
            <div className="d-flex justify-content-between align-items-center">
              <CardTitle as={'h4'}>Performance</CardTitle>
              <div>
                <button type="button" className="btn btn-sm btn-outline-light">
                  ALL
                </button>
                &nbsp;
                <button type="button" className="btn btn-sm btn-outline-light">
                  1M
                </button>
                &nbsp;
                <button type="button" className="btn btn-sm btn-outline-light">
                  6M
                </button>
                &nbsp;
                <button type="button" className="btn btn-sm btn-outline-light active">
                  1Y
                </button>
              </div>
            </div>
            <div dir="ltr">
              <div id="dash-performance-chart" className="apex-charts" />
              <ReactApexChart options={chartOptions} series={chartOptions.series} height={313} type="line" className="apex-charts" />
            </div>
          </CardBody>
        </Card>
      </Col>
    </>
  )
}
export default Stats
