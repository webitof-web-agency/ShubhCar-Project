'use client'
import PageTItle from '@/components/PageTItle'
import { currency } from '@/context/constants'
import { invoiceAPI } from '@/helpers/invoiceApi'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Alert, Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'

const InvoiceDetails = () => {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('id')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invoice, setInvoice] = useState(null)

  useEffect(() => {
    if (!invoiceId || !session?.accessToken) return
    const fetchInvoice = async () => {
      try {
        const response = await invoiceAPI.get(invoiceId, session.accessToken)
        setInvoice(response.data?.invoice || response.invoice || null)
      } catch (err) {
        setError(err.message || 'Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }
    fetchInvoice()
  }, [invoiceId, session])

  const handleViewPdf = async () => {
    if (!invoiceId || !session?.accessToken) return
    try {
      const blob = await invoiceAPI.getPdf(invoiceId, session.accessToken, false)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      setError(err.message || 'Failed to view invoice')
    }
  }

  const handleDownloadPdf = async () => {
    if (!invoiceId || !session?.accessToken) return
    try {
      const blob = await invoiceAPI.getPdf(invoiceId, session.accessToken, true)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoice?.invoiceNumber || invoiceId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Failed to download invoice')
    }
  }

  const handlePrintPdf = async () => {
    if (!invoiceId || !session?.accessToken) return
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

  if (loading) {
    return (
      <>
        <PageTItle title="INVOICE DETAILS" />
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      </>
    )
  }

  if (!invoice) {
    return (
      <>
        <PageTItle title="INVOICE DETAILS" />
        <div className="text-center py-5 text-muted">Invoice not found</div>
      </>
    )
  }

  return (
    <>
      <PageTItle title="INVOICE DETAILS" />
      <Row className="justify-content-center">
        <Col lg={9}>
          {error && <Alert variant="danger">{error}</Alert>}
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">Invoice {invoice.invoiceNumber || invoice._id}</h4>
                  <div className="text-muted">
                    Issued: {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('en-IN') : '-'}
                  </div>
                  <div className="text-muted">Order: {invoice.orderSnapshot?.orderNumber || '-'}</div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm" onClick={handleViewPdf}>View PDF</button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={handlePrintPdf}>Print</button>
                  <button className="btn btn-primary btn-sm" onClick={handleDownloadPdf}>Download</button>
                </div>
              </div>

              <Row className="mt-4">
                <Col md={6}>
                  <h6 className="text-uppercase text-muted fs-12">Bill To</h6>
                  <div className="fw-semibold">{invoice.customerSnapshot?.name || '-'}</div>
                  <div className="text-muted">{invoice.customerSnapshot?.email || '-'}</div>
                  <div className="text-muted">{invoice.customerSnapshot?.phone || '-'}</div>
                </Col>
                <Col md={6}>
                  <h6 className="text-uppercase text-muted fs-12">Address</h6>
                  <div className="text-muted">
                    {[
                      invoice.customerSnapshot?.address?.line1,
                      invoice.customerSnapshot?.address?.line2,
                      invoice.customerSnapshot?.address?.city,
                      invoice.customerSnapshot?.address?.state,
                      invoice.customerSnapshot?.address?.postalCode,
                      invoice.customerSnapshot?.address?.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </Col>
              </Row>

              <div className="table-responsive mt-4">
                <table className="table table-bordered align-middle">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Tax %</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((item, idx) => (
                      <tr key={`${item.name}-${idx}`}>
                        <td>{item.name || 'Item'}</td>
                        <td>{item.quantity}</td>
                        <td>{currency}{item.unitPrice}</td>
                        <td>{item.taxPercent ?? 0}</td>
                        <td className="text-end">{currency}{item.lineTotal ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Row className="justify-content-end">
                <Col lg={4}>
                  <table className="table table-borderless mb-0">
                    <tbody>
                      <tr>
                        <td className="text-end">Subtotal</td>
                        <td className="text-end">{currency}{invoice.totals?.subtotal ?? 0}</td>
                      </tr>
                      <tr>
                        <td className="text-end">Tax</td>
                        <td className="text-end">{currency}{invoice.totals?.taxTotal ?? 0}</td>
                      </tr>
                      <tr>
                        <td className="text-end">Discount</td>
                        <td className="text-end">{currency}{invoice.totals?.discountTotal ?? 0}</td>
                      </tr>
                      <tr className="border-top">
                        <td className="text-end fw-semibold">Grand Total</td>
                        <td className="text-end fw-semibold">{currency}{invoice.totals?.grandTotal ?? 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default InvoiceDetails
