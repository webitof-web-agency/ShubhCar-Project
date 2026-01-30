'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { currency } from '@/context/constants'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardBody, CardFooter, CardTitle, Col, Row, Spinner, Alert } from 'react-bootstrap'
import { invoiceAPI } from '@/helpers/invoiceApi'

const InvoiceList = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invoices, setInvoices] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (session?.accessToken) {
      fetchInvoices()
    }
  }, [session, page])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await invoiceAPI.list({ page, limit: 20 }, session.accessToken)
      const payload = response.data || response
      const list = payload.invoices || payload.data || []
      const pagination = payload.pagination || {}
      setInvoices(list)
      setTotalPages(pagination.pages || 1)
    } catch (err) {
      setError(err.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (invoiceId) => {
    if (!session?.accessToken) return
    try {
      const blob = await invoiceAPI.getPdf(invoiceId, session.accessToken, false)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      setError(err.message || 'Failed to view invoice')
    }
  }

  const handleDownload = async (invoiceId) => {
    if (!session?.accessToken) return
    try {
      const blob = await invoiceAPI.getPdf(invoiceId, session.accessToken, true)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoiceId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Failed to download invoice')
    }
  }

  const handlePrint = async (invoiceId) => {
    if (!session?.accessToken) return
    try {
      const blob = await invoiceAPI.getPdf(invoiceId, session.accessToken, false)
      const url = URL.createObjectURL(blob)
      const popup = window.open(url, '_blank')
      if (!popup) return
      popup.focus()
      popup.print()
    } catch (err) {
      setError(err.message || 'Failed to print invoice')
    }
  }

  return (
    <Row>
      <Col xl={12}>
        <Card>
          <div className="d-flex card-header justify-content-between align-items-center">
            <div>
              <CardTitle as={'h4'}>Invoices</CardTitle>
            </div>
          </div>
          <CardBody className="p-0">
            {error && <Alert variant="danger" className="m-3">{error}</Alert>}
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover table-centered">
                <thead className="bg-light-subtle">
                  <tr>
                    <th style={{ width: 20 }}>
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="customCheck1" />
                        <label className="form-check-label" htmlFor="customCheck1" />
                      </div>
                    </th>
                    <th>Invoice</th>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4">
                        <Spinner animation="border" />
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-muted">No invoices found</td>
                    </tr>
                  ) : (
                    invoices.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <div className="form-check">
                            <input type="checkbox" className="form-check-input" id={`invoice-${item._id}`} />
                            <label className="form-check-label" htmlFor={`invoice-${item._id}`}>
                              &nbsp;
                            </label>
                          </div>
                        </td>
                        <td>
                          <Link href="#" className="text-body">
                            {item.invoiceNumber || item._id?.slice(0, 6)}
                          </Link>
                        </td>
                        <td>{item.orderSnapshot?.orderNumber || '-'}</td>
                        <td>{item.customerSnapshot?.name || '-'}</td>
                        <td>{item.issuedAt ? new Date(item.issuedAt).toLocaleDateString('en-IN') : '-'}</td>
                        <td>{currency}{item.totals?.grandTotal ?? 0}</td>
                        <td>
                          <span className="badge bg-success-subtle text-success py-1 px-2">
                            {item.status || 'Paid'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <button className="btn btn-light btn-sm" onClick={() => handleView(item._id)}>
                              <IconifyIcon icon="solar:eye-broken" className="align-middle fs-18" />
                            </button>
                            <button className="btn btn-soft-primary btn-sm" onClick={() => handleDownload(item._id)}>
                              <IconifyIcon icon="solar:download-broken" className="align-middle fs-18" />
                            </button>
                            <button className="btn btn-soft-secondary btn-sm" onClick={() => handlePrint(item._id)}>
                              <IconifyIcon icon="solar:printer-broken" className="align-middle fs-18" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
          {!loading && totalPages > 1 && (
            <CardFooter className="border-top">
              <nav aria-label="Page navigation example">
                <ul className="pagination justify-content-end mb-0">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                      Previous
                    </button>
                  </li>
                  <li className="page-item active">
                    <span className="page-link">{page}</span>
                  </li>
                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </CardFooter>
          )}
        </Card>
      </Col>
    </Row>
  )
}

export default InvoiceList
