'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { settingsAPI } from '@/helpers/settingsApi'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Row, Spinner, Nav, Tab } from 'react-bootstrap'

const defaultData = {
  // Numbering
  order_number_prefix: 'ORD-',
  order_number_digits: 6,
  order_number_start: 1,
  order_number_next: 1,
  invoice_number_prefix: 'INV-',
  invoice_number_digits: 6,
  invoice_number_start: 1,
  invoice_number_next: 1,
  // Company
  invoice_company_name: '',
  invoice_company_address_line1: '',
  invoice_company_address_line2: '',
  invoice_company_city: '',
  invoice_company_state: '',
  invoice_company_pincode: '',
  invoice_company_gstin: '',
  // Contact
  invoice_company_email: '',
  invoice_company_phone: '',
  invoice_company_website: '',
  invoice_logo_url: '',
  // Terms
  invoice_terms: '',
  invoice_notes: '',
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
  const [copying, setCopying] = useState(false)
  const [formData, setFormData] = useState(defaultData)
  const [activeTab, setActiveTab] = useState('numbering')
  const [gstinError, setGstinError] = useState('')

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
          ...Object.keys(defaultData).reduce((acc, key) => {
            if (data[key] !== undefined) acc[key] = data[key]
            return acc
          }, {})
        }))
      } catch (error) {
        console.error('Failed to fetch invoice settings', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [session])

  // Validate GSTIN format (15 alphanumeric characters)
  const validateGSTIN = (gstin) => {
    if (!gstin) return { valid: false, message: 'GSTIN is required for invoices' }
    const trimmed = gstin.trim()
    if (trimmed.length !== 15) {
      return { valid: false, message: 'GSTIN must be exactly 15 characters' }
    }
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    if (!gstinRegex.test(trimmed)) {
      return { valid: false, message: 'Invalid GSTIN format (e.g., 27AAAAA0000A1Z5)' }
    }
    return { valid: true, message: '' }
  }

  // Copy store address details to invoice settings
  const copyFromStoreSettings = async () => {
    if (!session?.accessToken) {
      toast.error('Authentication required')
      return
    }

    setCopying(true)
    try {
      const response = await settingsAPI.list(undefined, session.accessToken)
      const data = response.data || response

      // Check if any store data exists
      const hasStoreData = data.store_name || data.store_address || data.store_city || data.store_email || data.store_phone

      if (!hasStoreData) {
        toast.warning('No store address found. Please fill in Ecommerce Settings first.')
        setCopying(false)
        return
      }

      // Map store fields to invoice fields, preserving existing values when store data is empty
      const updates = {}
      if (data.store_name) updates.invoice_company_name = data.store_name
      if (data.store_address) updates.invoice_company_address_line1 = data.store_address
      if (data.store_city) updates.invoice_company_city = data.store_city
      if (data.store_zip) updates.invoice_company_pincode = data.store_zip
      if (data.store_email) updates.invoice_company_email = data.store_email
      if (data.store_phone) updates.invoice_company_phone = data.store_phone
      if (data.billing_state) updates.invoice_company_state = data.billing_state

      if (Object.keys(updates).length === 0) {
        toast.info('No complete store information available to copy')
        setCopying(false)
        return
      }

      setFormData(prev => ({ ...prev, ...updates }))
      toast.success(`Copied ${Object.keys(updates).length} fields from store address. Please review and add GSTIN.`)
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error('Failed to copy store details. Please try again.')
    } finally {
      setCopying(false)
    }
  }


  const handleSave = async (overrides = {}, skipValidation = false) => {
    if (!session?.accessToken) return

    // Only validate GSTIN for full saves, not for counter resets
    if (!skipValidation) {
      const gstinValidation = validateGSTIN(formData.invoice_company_gstin)
      if (!gstinValidation.valid) {
        setGstinError(gstinValidation.message)
        toast.error(gstinValidation.message)
        setActiveTab('company') // Switch to company tab to show error
        return
      }
      setGstinError('') // Clear any previous error
    }

    setSaving(true)
    try {
      const payload = {
        // Numbering
        order_number_prefix: formData.order_number_prefix,
        order_number_digits: Number(formData.order_number_digits || 1),
        order_number_start: Number(formData.order_number_start || 1),
        order_number_next: Number(formData.order_number_next || formData.order_number_start || 1),
        invoice_number_prefix: formData.invoice_number_prefix,
        invoice_number_digits: Number(formData.invoice_number_digits || 1),
        invoice_number_start: Number(formData.invoice_number_start || 1),
        invoice_number_next: Number(formData.invoice_number_next || formData.invoice_number_start || 1),
        // Company
        invoice_company_name: formData.invoice_company_name,
        invoice_company_address_line1: formData.invoice_company_address_line1,
        invoice_company_address_line2: formData.invoice_company_address_line2,
        invoice_company_city: formData.invoice_company_city,
        invoice_company_state: formData.invoice_company_state,
        invoice_company_pincode: formData.invoice_company_pincode,
        invoice_company_gstin: formData.invoice_company_gstin.trim().toUpperCase(),
        // Contact
        invoice_company_email: formData.invoice_company_email,
        invoice_company_phone: formData.invoice_company_phone,
        invoice_company_website: formData.invoice_company_website,
        invoice_logo_url: formData.invoice_logo_url,
        // Terms
        invoice_terms: formData.invoice_terms,
        invoice_notes: formData.invoice_notes,
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
              Invoice Settings
            </CardTitle>
            <Button size="sm" variant="success" onClick={() => handleSave()} disabled={saving}>
              {saving ? 'Saving...' : 'Save All'}
            </Button>
          </CardHeader>
          <CardBody>
            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
              <Nav variant="tabs" className="mb-3">
                <Nav.Item>
                  <Nav.Link eventKey="numbering">Numbering</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="company">Company Details</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="contact">Contact & Branding</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="terms">Terms & Notes</Nav.Link>
                </Nav.Item>
              </Nav>
              <Tab.Content>
                {/* Numbering Tab */}
                <Tab.Pane eventKey="numbering">
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
                          onClick={() => handleSave({ order_number_next: Number(formData.order_number_start || 1) }, true)}
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
                          onClick={() => handleSave({ invoice_number_next: Number(formData.invoice_number_start || 1) }, true)}
                          disabled={saving}
                        >
                          Reset Counter
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* Company Details Tab */}
                <Tab.Pane eventKey="company">
                  <div className="alert alert-info border-info d-flex align-items-start gap-2 mb-3">
                    <IconifyIcon icon="mdi:information-outline" className="fs-20 mt-1" />
                    <div className="flex-grow-1">
                      <strong>Invoice Company Details:</strong> This information appears on customer invoices and must include GSTIN for tax compliance.
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={copyFromStoreSettings}
                          disabled={copying || loading}
                        >
                          {copying ? (
                            <>
                              <Spinner size="sm" className="me-1" />
                              Copying...
                            </>
                          ) : (
                            <>
                              <IconifyIcon icon="mdi:content-copy" className="me-1" />
                              Copy from Store Address
                            </>
                          )}
                        </Button>
                        <small className="text-muted ms-2">Quickly fill fields from your Ecommerce Settings</small>
                      </div>
                    </div>
                  </div>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Label>Company Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        value={formData.invoice_company_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_company_name: e.target.value }))}
                        placeholder="Your Company India Pvt Ltd"
                      />
                    </Col>
                    <Col md={12}>
                      <Form.Label>Address Line 1 <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        value={formData.invoice_company_address_line1}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_company_address_line1: e.target.value }))}
                        placeholder="123, Business Address, Area"
                      />
                    </Col>
                    <Col md={12}>
                      <Form.Label>Address Line 2</Form.Label>
                      <Form.Control
                        value={formData.invoice_company_address_line2}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_company_address_line2: e.target.value }))}
                        placeholder="Landmark, Building Name (Optional)"
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Label>City <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        value={formData.invoice_company_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_company_city: e.target.value }))}
                        placeholder="Mumbai"
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Label>State <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        value={formData.invoice_company_state}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_company_state: e.target.value }))}
                        placeholder="Maharashtra"
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Label>PIN Code <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        value={formData.invoice_company_pincode}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_company_pincode: e.target.value }))}
                        placeholder="400001"
                        maxLength={6}
                      />
                    </Col>
                    <Col md={12}>
                      <Form.Label>GST Identification Number (GSTIN) <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        value={formData.invoice_company_gstin}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, invoice_company_gstin: e.target.value.toUpperCase() }))
                          setGstinError('') // Clear error on change
                        }}
                        placeholder="06AAACA1234A1ZA"
                        maxLength={15}
                        isInvalid={!!gstinError}
                      />
                      {gstinError && (
                        <Form.Control.Feedback type="invalid" className="d-block">
                          {gstinError}
                        </Form.Control.Feedback>
                      )}
                      <small className="text-muted">15-character alphanumeric GST number (auto-converts to uppercase)</small>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* Contact & Branding Tab */}
                <Tab.Pane eventKey="contact">
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Contact Email <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="email"
                        value={formData.invoice_company_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_company_email: e.target.value }))}
                        placeholder="support@example.com"
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Contact Phone <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        value={formData.invoice_company_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_company_phone: e.target.value }))}
                        placeholder="+91 1800-123-4567"
                      />
                    </Col>
                    <Col md={12}>
                      <Form.Label>Website</Form.Label>
                      <Form.Control
                        value={formData.invoice_company_website}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_company_website: e.target.value }))}
                        placeholder="www.example.com"
                      />
                    </Col>
                    <Col md={12}>
                      <Form.Label>Invoice Logo URL</Form.Label>
                      <Form.Control
                        value={formData.invoice_logo_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_logo_url: e.target.value }))}
                        placeholder="/uploads/logo.png or full URL"
                      />
                      <small className="text-muted">Leave blank to use default site logo</small>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* Terms & Notes Tab */}
                <Tab.Pane eventKey="terms">
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Label>Terms & Conditions</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={formData.invoice_terms}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_terms: e.target.value }))}
                        placeholder="Goods once sold will not be taken back or exchanged. All disputes are subject to local jurisdiction."
                      />
                      <small className="text-muted">Displayed at bottom of invoice</small>
                    </Col>
                    <Col md={12}>
                      <Form.Label>Invoice Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={formData.invoice_notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_notes: e.target.value }))}
                        placeholder="This is a computer generated invoice."
                      />
                      <small className="text-muted">Additional notes for invoices</small>
                    </Col>
                  </Row>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default InvoiceSettings
