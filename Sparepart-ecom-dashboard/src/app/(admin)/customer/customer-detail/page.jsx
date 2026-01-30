'use client'
import userProfile from '@/assets/images/user-profile.png'
import avatar2 from '@/assets/images/users/avatar-2.jpg'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { orderAPI, getStatusBadge } from '@/helpers/orderApi'
import { userAPI } from '@/helpers/userApi'
import Image from 'next/image'
import { Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Dropdown, DropdownMenu, DropdownToggle, Row, Spinner, Alert, Button } from 'react-bootstrap'
import CustomerChart from './components/CustomerChart'
import CustomerDetailsCard from './components/CustomerDetailsCard'
import PageTItle from '@/components/PageTItle'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { currency } from '@/context/constants'
import { API_BASE_URL } from '@/helpers/apiBase'

// Separate component for content that uses useSearchParams
const CustomerDetailContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const customerId = searchParams.get('id')
  const { data: session, status } = useSession()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [stats, setStats] = useState({
    totalInvoice: 0,
    totalOrder: 0,
    totalSpent: 0
  })
  const [approving, setApproving] = useState(false)
  const [ordersPage, setOrdersPage] = useState(1)
  const ordersPerPage = 6

  // Loading state for most purchased products specifically
  const [loadingTopProducts, setLoadingTopProducts] = useState(false)

  const topProducts = useMemo(() => {
    const map = new Map()
    // Prioritize orderItems (detailed), fallback to orders items (summary)
    const sourceItems = orderItems.length > 0
      ? orderItems
      : orders.flatMap((order) => order.items || order.orderItems || order.products || [])

    sourceItems.forEach((item) => {
      const productId = item.productId?._id || item.productId || item.product?._id || item.product || item._id
      const name = item.productName || item.name || item.productId?.name || item.product?.name || item.title
      if (!productId && !name) return
      const key = String(productId || name)
      const qty = Number(item.quantity || item.qty || 0) || 0
      const amount = Number(item.total || item.subtotal || item.price || item.salePrice || 0) || 0
      const current = map.get(key) || { id: productId, name: name || 'Product', quantity: 0, amount: 0 }
      current.quantity += qty
      current.amount += amount
      map.set(key, current)
    })
    return Array.from(map.values())
      .filter((item) => item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
  }, [orders, orderItems])

  const ordersTotalPages = Math.max(1, Math.ceil(orders.length / ordersPerPage))
  const pagedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPerPage
    return orders.slice(start, start + ordersPerPage)
  }, [orders, ordersPage, ordersPerPage])

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      let token = session?.accessToken

      // Fallback to localStorage
      if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem('authToken')
      }

      if (!customerId) {
        setError('No customer ID provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Parallel Fetch: Customer + Orders
        const [userRes, ordersRes] = await Promise.all([
          userAPI.adminGetById(customerId, token),
          orderAPI.list({ userId: customerId, limit: 50 }, token)
        ])

        if (!userRes) throw new Error('Customer not found')
        setCustomer(userRes)

        const ordersPayload = ordersRes.data || []
        const customerOrders = Array.isArray(ordersPayload) ? ordersPayload : (ordersPayload.items || [])

        // Sort orders by date desc if not already
        const sortedOrders = customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setOrders(sortedOrders)

        // Calculate Stats
        const totalSpent = sortedOrders.reduce((acc, curr) => acc + (curr.total || curr.grandTotal || 0), 0)
        setStats({
          totalInvoice: sortedOrders.length,
          totalOrder: sortedOrders.length,
          totalSpent: totalSpent
        })

      } catch (err) {
        console.error(err)
        setError(err.message || 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [customerId, session, status])

  // Separate Effect for Order Details (Products) - Non-blocking
  useEffect(() => {
    let isActive = true

    const fetchOrderItems = async () => {
      let token = session?.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null)

      if (!token || orders.length === 0) return

      try {
        setLoadingTopProducts(true)
        // Optimize: Only fetch details for top 10 recent orders to guess trends, 
        // fetching 20 might be too heavy. 
        const targetOrders = orders.slice(0, 20)

        const details = await Promise.all(
          targetOrders.map((order) => orderAPI.getOrderDetail(order._id, token).catch(() => null))
        )

        if (isActive) {
          const items = details
            .filter(Boolean)
            .flatMap((detail) => detail?.data?.items || detail?.items || detail?.orderItems || [])
          setOrderItems(items)
        }
      } catch (error) {
        console.error('Failed to fetch order items:', error)
      } finally {
        if (isActive) setLoadingTopProducts(false)
      }
    }

    // Debounce slightly to allow main thread to clear
    const timer = setTimeout(fetchOrderItems, 100)
    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [orders, session])

  const handleApproveWholesale = async () => {
    let token = session?.accessToken
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('authToken')
    }
    if (!token || !customer?._id) return

    const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'this customer'
    const confirmed = window.confirm(`Approve wholesale customer ${name}?`)
    if (!confirmed) return

    try {
      setApproving(true)
      const response = await fetch(`${API_BASE_URL}/users/admin/${customer._id}/approve-wholesale`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to approve wholesale customer')
      }

      const data = await response.json()
      const updated = data?.data || {}
      setCustomer(prev => ({
        ...prev,
        verificationStatus: updated.verificationStatus || 'approved',
        verifiedAt: updated.verifiedAt || prev.verifiedAt
      }))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to approve wholesale customer')
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return <CustomerDetailSkeleton />
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-3">
        {error}
      </Alert>
    )
  }

  if (!customer) {
    return <Alert variant="warning" className="m-3">Customer not found</Alert>
  }

  return (
    <>
      <PageTItle title="CUSTOMER DETAILS" />
      <Row>
        <Col lg={4}>
          <ProfileCard customer={customer} onApproveWholesale={handleApproveWholesale} approving={approving} />
          <Card className="mt-4">
            <CardHeader>
              <CardTitle as={'h4'}>Most Purchased Products</CardTitle>
            </CardHeader>
            <CardBody>
              {loadingTopProducts && topProducts.length === 0 ? (
                <div className="d-flex flex-column gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="d-flex p-2 gap-2 bg-light-subtle rounded">
                      <div style={{ width: 40, height: 40 }} className="bg-secondary-subtle rounded-circle" />
                      <div className="w-100">
                        <div className="bg-secondary-subtle rounded" style={{ height: 16, width: '60%', marginBottom: 4 }}></div>
                        <div className="bg-secondary-subtle rounded" style={{ height: 12, width: '30%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : topProducts.length === 0 ? (
                <div className="text-muted text-center py-4">No product data available</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {topProducts.map((product) => (
                    <div
                      key={product.id || product.name}
                      onClick={() => product.id && router.push(`/products/product-edit?id=${product.id}`)}
                      className={`d-flex p-2 rounded align-items-center gap-2 bg-light-subtle ${product.id ? 'cursor-pointer' : ''}`}
                    >
                      <div className="avatar bg-primary-subtle d-flex align-items-center justify-content-center rounded-circle">
                        <IconifyIcon icon="solar:box-minimalistic-bold" className="text-primary fs-3" />
                      </div>
                      <div className="d-block overflow-hidden">
                        <div className="text-dark fw-medium text-truncate" title={product.name}>{product.name}</div>
                        <p className="text-muted mb-0 fs-13">Qty: {product.quantity}</p>
                      </div>
                      <div className="ms-auto text-end flex-shrink-0">
                        <span className="fw-semibold text-dark">{currency}{product.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col lg={8}>
          <Row>
            <CustomerDetailsCard stats={stats} />
          </Row>

          <Card>
            <CardHeader>
              <CardTitle as={'h4'}>Latest Orders</CardTitle>
            </CardHeader>
            <CardBody>
              {pagedOrders.map((order, idx) => (
                <div
                  key={order._id || idx}
                  onClick={() => router.push(`/orders/order-detail?id=${order._id}`)}
                  className="cursor-pointer"
                >
                  <LatestInvoiceCard order={order} />
                </div>
              ))}
              {orders.length === 0 && (
                <div className="text-muted text-center py-4">No recent orders</div>
              )}
            </CardBody>
            <CardFooter className="border-top">
              <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
                <div className="text-muted">
                  {orders.length === 0
                    ? 'Showing 0 orders'
                    : `Showing ${((ordersPage - 1) * ordersPerPage) + 1}-${Math.min(ordersPage * ordersPerPage, orders.length)} of ${orders.length} orders`}
                </div>
                <nav aria-label="Orders pagination">
                  <ul className="pagination justify-content-end mb-0">
                    <li className={`page-item ${ordersPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setOrdersPage((prev) => Math.max(1, prev - 1))}
                        disabled={ordersPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    <li className="page-item active">
                      <span className="page-link">{ordersPage}</span>
                    </li>
                    <li className={`page-item ${ordersPage === ordersTotalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setOrdersPage((prev) => Math.min(ordersTotalPages, prev + 1))}
                        disabled={ordersPage === ordersTotalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </CardFooter>
          </Card>

        </Col>
      </Row>
    </>
  )
}

// SKELETON COMPONENT
const CustomerDetailSkeleton = () => {
  return (
    <div className="animate-pulse">
      <PageTItle title="CUSTOMER DETAILS" />
      <Row>
        <Col lg={4}>
          <Card>
            <CardBody className="p-0">
              <div className="bg-secondary-subtle p-5" style={{ height: 140 }}></div>
              <div className="p-4" style={{ marginTop: -40 }}>
                <div className="bg-secondary-subtle rounded-circle border border-3 border-white mx-auto ms-4" style={{ width: 80, height: 80 }}></div>
                <div className="mt-3">
                  <div className="bg-secondary-subtle rounded w-50 h-3 mb-2"></div>
                  <div className="bg-secondary-subtle rounded w-75 h-2"></div>
                  <div className="mt-3 pt-3 border-top gap-2 d-flex flex-column">
                    <div className="bg-secondary-subtle rounded w-100 h-2"></div>
                    <div className="bg-secondary-subtle rounded w-100 h-2"></div>
                    <div className="bg-secondary-subtle rounded w-100 h-2"></div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle as="h4">Most Purchased Products</CardTitle></CardHeader>
            <CardBody>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="d-flex align-items-center gap-2 mb-3">
                  <div className="bg-secondary-subtle rounded-circle" style={{ width: 40, height: 40 }}></div>
                  <div className="flex-grow-1">
                    <div className="bg-secondary-subtle rounded w-75 h-2 mb-1"></div>
                    <div className="bg-secondary-subtle rounded w-25 h-2"></div>
                  </div>
                  <div className="bg-secondary-subtle rounded w-25 h-3"></div>
                </div>
              ))}
            </CardBody>
          </Card>
        </Col>
        <Col lg={8}>
          {/* Stats Skeleton */}
          <Row>
            {[1, 2, 3].map(i => (
              <Col lg={4} key={i}>
                <Card className="mb-3">
                  <CardBody className="p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="bg-secondary-subtle rounded w-50 h-2 mb-2"></div>
                        <div className="bg-secondary-subtle rounded w-25 h-4"></div>
                      </div>
                      <div className="bg-secondary-subtle rounded" style={{ width: 40, height: 40 }}></div>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Orders Skeleton */}
          <Card>
            <CardHeader><CardTitle as="h4">Latest Orders</CardTitle></CardHeader>
            <CardBody>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="d-flex align-items-center gap-2 mb-3 bg-light-subtle p-2 rounded">
                  <div className="bg-secondary-subtle rounded-circle" style={{ width: 40, height: 40 }}></div>
                  <div className="flex-grow-1">
                    <div className="bg-secondary-subtle rounded w-25 h-2 mb-1"></div>
                    <div className="bg-secondary-subtle rounded w-25 h-1"></div>
                  </div>
                  <div className="bg-secondary-subtle rounded w-25 h-3"></div>
                </div>
              ))}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

const ProfileCard = ({ customer, onApproveWholesale, approving }) => {
  const showApprove = customer?.customerType === 'wholesale' && customer?.verificationStatus === 'pending'
  const verificationLabel = customer.verificationStatus === 'approved'
    ? 'Approved'
    : customer.verificationStatus === 'pending'
      ? 'Pending'
      : customer.verificationStatus === 'rejected'
        ? 'Rejected'
        : 'Not Required'

  const statusLabel = customer.status === 'active'
    ? 'Active'
    : customer.status === 'inactive'
      ? 'Inactive'
      : customer.status === 'banned'
        ? 'Banned'
        : customer.status || 'Unknown'
  return (
    <Card className="overflow-hidden">
      <CardBody>
        <div className="bg-primary profile-bg rounded-top p-5 position-relative mx-n3 mt-n3">
          <div className="avatar-lg border border-light border-3 rounded-circle position-absolute top-100 start-0 translate-middle ms-5 bg-light d-flex justify-content-center align-items-center">
            {customer.avatar ? (
              <Image src={customer.avatar} alt="avatar" width={80} height={80} className="rounded-circle" />
            ) : (
              <span className="fs-1 fw-bold text-primary">{customer.firstName?.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
        <div className="mt-4 pt-3">
          <h4 className="mb-1">
            {' '}
            {customer.firstName} {customer.lastName}
            {customer.status === 'active' && <IconifyIcon icon="bxs:badge-check" className="text-success align-middle ms-1" />}
          </h4>
          <div className="mt-2">
            <p className="link-primary fs-15">
              {customer.email}
            </p>
            <p className="d-flex mb-0 align-items-center gap-1 fw-semibold text-dark">Account ID : <span className="text-dark fw-medium px-0">#{customer._id.slice(-6).toUpperCase()}</span></p>
            <p className="fs-15 mb-1 mt-1">
              <span className="text-dark fw-semibold">Email : </span> {customer.email}
            </p>
            <p className="fs-15 mb-0 mt-1">
              <span className="text-dark fw-semibold">Phone : </span> {customer.phone || 'N/A'}
            </p>
            <p className="d-flex mb-0 align-items-center gap-1 fw-semibold text-dark"> Customer Type : <span className="text-dark fw-medium px-0 text-capitalize">{customer.customerType}</span></p>

            <div className="mt-3 pt-3 border-top">
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <span className="fw-semibold text-dark">Verified Status :</span>
                <span className="text-dark fw-medium">{verificationLabel}</span>
              </div>
              <div className="d-flex justify-content-between flex-wrap gap-2 mt-2">
                <span className="fw-semibold text-dark">Account Status :</span>
                <span className="text-dark fw-medium">{statusLabel}</span>
              </div>
              <div className="d-flex justify-content-between flex-wrap gap-2 mt-2">
                <span className="fw-semibold text-dark">Registration Date :</span>
                <span className="text-dark fw-medium">
                  {customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
      <CardFooter className="border-top">
        <div className="d-flex gap-2">
          {showApprove && (
            <Button
              variant="success"
              className="w-100"
              onClick={onApproveWholesale}
              disabled={approving}
            >
              {approving ? 'Approving...' : 'Approve Wholesale'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

const LatestInvoiceCard = ({ order }) => {
  const orderNumber = order.orderNumber || order.invoiceNumber || order.orderId || order._id?.slice(-6).toUpperCase()
  const status = order.orderStatus || order.status || 'unknown'
  const statusBadge = getStatusBadge(status)
  return (
    <div className="d-flex p-2 rounded align-items-center gap-2 bg-light-subtle mb-2">
      <div className="avatar bg-primary-subtle d-flex align-items-center justify-content-center rounded-circle">
        <IconifyIcon icon="solar:bill-list-bold" className="text-primary fs-3" />
      </div>
      <div className="d-block">
        <Link href={`/orders/order-detail?id=${order._id}`} className="text-dark fw-medium">
          Order #{orderNumber}
        </Link>
        <p className="text-muted mb-0 fs-13">
          {new Date(order.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>
      <div className="ms-auto text-end">
        <span className="d-inline-flex align-items-center gap-2">
          <span
            className={`badge bg-${statusBadge?.bg || 'secondary'}-subtle text-${statusBadge?.bg || 'secondary'} px-2 py-1`}
          >
            {statusBadge?.text || status}
          </span>
          <span className="fw-semibold text-dark">{currency}{(order.total || order.grandTotal || 0)}</span>
        </span>
      </div>
    </div>
  )
}

const CustomerDetailPage = () => {
  return (
    <Suspense fallback={<div className="text-center p-5"><Spinner animation="border" /></div>}>
      <CustomerDetailContent />
    </Suspense>
  )
}

export default CustomerDetailPage
