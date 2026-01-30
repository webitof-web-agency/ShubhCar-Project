'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { settingsAPI } from '@/helpers/settingsApi'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Row, Spinner } from 'react-bootstrap'

const defaultData = {
  order_number_prefix: 'ORD-',
  order_number_digits: 6,
  order_number_start: 1,
  order_number_next: 1,
  invoice_number_prefix: 'INV-',
  invoice_number_digits: 6,
  invoice_number_start: 1,
  invoice_number_next: 1,
}

const padNumber = (value, digits) => {
  const num = Number(value || 0)
  const width = Math.max(1, Number(digits || 1))
  return String(num).padStart(width, '0')
}

const InvoiceSettings = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultData)

  useEffect(() => {
    const fetchSettings = async () => {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }
      try {
        const response = await settingsAPI.list(undefined, session.accessToken)
        const data = response.data || response
        setFormData(prev => ({
          ...prev,
          order_number_prefix: data.order_number_prefix ?? prev.order_number_prefix,
          order_number_digits: data.order_number_digits ?? prev.order_number_digits,
          order_number_start: data.order_number_start ?? prev.order_number_start,
          order_number_next: data.order_number_next ?? prev.order_number_next,
          invoice_number_prefix: data.invoice_number_prefix ?? prev.invoice_number_prefix,
          invoice_number_digits: data.invoice_number_digits ?? prev.invoice_number_digits,
          invoice_number_start: data.invoice_number_start ?? prev.invoice_number_start,
          invoice_number_next: data.invoice_number_next ?? prev.invoice_number_next,
        }))
      } catch (error) {
        console.error('Failed to fetch invoice settings', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [session])

  const handleSave = async (overrides = {}) => {
    if (!session?.accessToken) return
    setSaving(true)
    try {
      const payload = {
        order_number_prefix: formData.order_number_prefix,
        order_number_digits: Number(formData.order_number_digits || 1),
        order_number_start: Number(formData.order_number_start || 1),
        order_number_next: Number(formData.order_number_next || formData.order_number_start || 1),
        invoice_number_prefix: formData.invoice_number_prefix,
        invoice_number_digits: Number(formData.invoice_number_digits || 1),
        invoice_number_start: Number(formData.invoice_number_start || 1),
        invoice_number_next: Number(formData.invoice_number_next || formData.invoice_number_start || 1),
        ...overrides,
      }
      await settingsAPI.update(payload, session.accessToken)
      setFormData(prev => ({ ...prev, ...payload }))
      toast.success('Invoice settings saved successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save invoice settings')
    } finally {
      setSaving(false)
    }
  }

  const nextOrderPreview = `${formData.order_number_prefix}${padNumber(formData.order_number_next, formData.order_number_digits)}`
  const nextInvoicePreview = `${formData.invoice_number_prefix}${padNumber(formData.invoice_number_next, formData.invoice_number_digits)}`

  if (loading) return <div className="text-center py-3"><Spinner size="sm" /></div>

  return (
    <Row>
      <Col lg={12}>
        <Card className="mt-3">
          <CardHeader className="d-flex justify-content-between align-items-center">
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1 mb-0">
              <IconifyIcon icon="solar:bill-list-bold-duotone" className="text-primary fs-20" />
              Invoice & Order ID Settings
            </CardTitle>
            <Button size="sm" variant="success" onClick={() => handleSave()} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </CardHeader>
          <CardBody>
            <Row className="g-3">
              <Col md={6}>
                <h6 className="text-uppercase text-muted fs-12">Order ID Format</h6>
                <Form.Label>Prefix</Form.Label>
                <Form.Control
                  value={formData.order_number_prefix}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_number_prefix: e.target.value }))}
                  placeholder="ORD-"
                />
                <Row className="g-2 mt-2">
                  <Col>
                    <Form.Label>Digits</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={formData.order_number_digits}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_number_digits: e.target.value }))}
                    />
                  </Col>
                  <Col>
                    <Form.Label>Start Number</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={formData.order_number_start}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_number_start: e.target.value }))}
                    />
                  </Col>
                  <Col>
                    <Form.Label>Next Number</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={formData.order_number_next}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_number_next: e.target.value }))}
                    />
                  </Col>
                </Row>
                <div className="d-flex align-items-center justify-content-between mt-2">
                  <span className="text-muted small">Next Order ID: {nextOrderPreview}</span>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => handleSave({ order_number_next: Number(formData.order_number_start || 1) })}
                    disabled={saving}
                  >
                    Reset Counter
                  </Button>
                </div>
              </Col>

              <Col md={6}>
                <h6 className="text-uppercase text-muted fs-12">Invoice ID Format</h6>
                <Form.Label>Prefix</Form.Label>
                <Form.Control
                  value={formData.invoice_number_prefix}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number_prefix: e.target.value }))}
                  placeholder="INV-"
                />
                <Row className="g-2 mt-2">
                  <Col>
                    <Form.Label>Digits</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={formData.invoice_number_digits}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_number_digits: e.target.value }))}
                    />
                  </Col>
                  <Col>
                    <Form.Label>Start Number</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={formData.invoice_number_start}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_number_start: e.target.value }))}
                    />
                  </Col>
                  <Col>
                    <Form.Label>Next Number</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={formData.invoice_number_next}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_number_next: e.target.value }))}
                    />
                  </Col>
                </Row>
                <div className="d-flex align-items-center justify-content-between mt-2">
                  <span className="text-muted small">Next Invoice ID: {nextInvoicePreview}</span>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => handleSave({ invoice_number_next: Number(formData.invoice_number_start || 1) })}
                    disabled={saving}
                  >
                    Reset Counter
                  </Button>
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default InvoiceSettings
