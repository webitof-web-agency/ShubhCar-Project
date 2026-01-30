'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { settingsAPI } from '@/helpers/settingsApi'
import { mediaAPI } from '@/helpers/mediaApi'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Row, Spinner, Tab, Tabs } from 'react-bootstrap'
import { INDIA_COUNTRY, INDIA_STATES, normalizeIndiaStateCode } from '@/helpers/indiaRegions'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import MediaPickerModal from '@/components/media/MediaPickerModal'

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/v1\/?$/, '')

const EcommerceSettings = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [mediaTarget, setMediaTarget] = useState(null)
  const [formData, setFormData] = useState({
    store_name: '',
    store_owner: '',
    store_phone: '',
    store_email: '',
    store_address: '',
    store_zip: '',
    store_city: '',
    store_country: INDIA_COUNTRY.code,
    billing_name: '',
    billing_phone: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    billing_country: INDIA_COUNTRY.code,
    coupon_enabled: true,
    coupon_sequential: false,
    product_weight_unit: 'kg',
    product_dimensions_unit: 'cm',
    shipping_enabled: true,
    shipping_free_threshold: 0,
    shipping_flat_rate: 0,
    shipping_handling_days: '2-4',
    site_logo_dark: '',
    site_logo_light: '',
    site_favicon: '',
  })

  useEffect(() => {
    const fetchSettings = async () => {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }
      try {
        const response = await settingsAPI.list(undefined, session.accessToken)
        const data = response.data || response
        const toBool = (value, fallback) => {
          if (value === true || value === 'true' || value === 1 || value === '1') return true
          if (value === false || value === 'false' || value === 0 || value === '0') return false
          return fallback
        }
        const toNumber = (value, fallback) => {
          if (value === null || value === undefined || value === '') return fallback
          const parsed = Number(value)
          return Number.isNaN(parsed) ? fallback : parsed
        }
        setFormData(prev => ({
          ...prev,
          store_name: data.store_name || '',
          store_owner: data.store_owner || '',
          store_phone: data.store_phone || '',
          store_email: data.store_email || '',
          store_address: data.store_address || '',
          store_zip: data.store_zip || '',
          store_city: data.store_city || '',
          store_country: INDIA_COUNTRY.code,
          billing_name: data.billing_name || '',
          billing_phone: data.billing_phone || '',
          billing_address: data.billing_address || '',
          billing_city: data.billing_city || '',
          billing_state: normalizeIndiaStateCode(data.billing_state || ''),
          billing_zip: data.billing_zip || '',
          billing_country: INDIA_COUNTRY.code,
          coupon_enabled: toBool(data.coupon_enabled, prev.coupon_enabled),
          coupon_sequential: toBool(data.coupon_sequential, prev.coupon_sequential),
          product_weight_unit: data.product_weight_unit || prev.product_weight_unit,
          product_dimensions_unit: data.product_dimensions_unit || prev.product_dimensions_unit,
          shipping_enabled: toBool(data.shipping_enabled, prev.shipping_enabled),
          shipping_free_threshold: toNumber(data.shipping_free_threshold, prev.shipping_free_threshold),
          shipping_flat_rate: toNumber(data.shipping_flat_rate, prev.shipping_flat_rate),
          shipping_handling_days: data.shipping_handling_days || prev.shipping_handling_days,
          site_logo_dark: data.site_logo_dark || '',
          site_logo_light: data.site_logo_light || '',
          site_favicon: data.site_favicon || '',
        }))
      } catch (error) {
        console.error('Failed to fetch ecommerce settings', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [session])

  const handleSave = async () => {
    if (!session?.accessToken) return
    try {
      await settingsAPI.update(
        {
          store_name: formData.store_name,
          store_owner: formData.store_owner,
          store_phone: formData.store_phone,
          store_email: formData.store_email,
          store_address: formData.store_address,
          store_zip: formData.store_zip,
          store_city: formData.store_city,
          store_country: INDIA_COUNTRY.code,
          billing_name: formData.billing_name,
          billing_phone: formData.billing_phone,
          billing_address: formData.billing_address,
          billing_city: formData.billing_city,
          billing_state: normalizeIndiaStateCode(formData.billing_state),
          billing_zip: formData.billing_zip,
          billing_country: INDIA_COUNTRY.code,
          coupon_enabled: !!formData.coupon_enabled,
          coupon_sequential: !!formData.coupon_sequential,
          product_weight_unit: formData.product_weight_unit,
          product_dimensions_unit: formData.product_dimensions_unit,
          shipping_enabled: !!formData.shipping_enabled,
          shipping_free_threshold: Number(formData.shipping_free_threshold || 0),
          shipping_flat_rate: Number(formData.shipping_flat_rate || 0),
          shipping_handling_days: formData.shipping_handling_days,
          site_logo_dark: formData.site_logo_dark || null,
          site_logo_light: formData.site_logo_light || null,
          site_favicon: formData.site_favicon || null,
        },
        session.accessToken
      )
      toast.success('Ecommerce settings saved successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save ecommerce settings')
    }
  }

  if (loading) return <div className="text-center py-3"><Spinner size="sm" /></div>

  const resolveMediaUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
  }

  const uploadLogo = async (files, field) => {
    const file = Array.isArray(files) ? files[files.length - 1] : null
    if (!file || !session?.accessToken) return
    try {
      const uploaded = await mediaAPI.upload([file], 'branding', session.accessToken)
      const items = uploaded?.data || []
      const logoUrl = Array.isArray(items) && items.length ? items[0].url : ''
      setFormData(prev => ({ ...prev, [field]: logoUrl }))
      toast.success('Image uploaded')
    } catch (error) {
      console.error(error)
      toast.error('Failed to upload image')
    }
  }

  return (
    <>
      <Row>
        <Col lg={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <CardTitle as={'h4'} className="d-flex align-items-center gap-1 mb-0">
                <IconifyIcon icon="solar:cart-large-2-bold-duotone" className="text-primary fs-20" />
                Ecommerce Settings
              </CardTitle>
              <Button size="sm" variant="success" onClick={handleSave}>Save Changes</Button>
            </CardHeader>
            <CardBody>
              <Tabs defaultActiveKey="store" className="nav-tabs card-tabs">
              <Tab eventKey="store" title="Store Address">
                <Row className="mt-3">
                  <Col lg={12}>
                    <h6 className="text-muted text-uppercase">Store Details</h6>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="store_name" className="form-label">Store Name</label>
                      <input
                        id="store_name"
                        className="form-control"
                        value={formData.store_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="store_owner" className="form-label">Store Owner Full Name</label>
                      <input
                        id="store_owner"
                        className="form-control"
                        value={formData.store_owner}
                        onChange={(e) => setFormData(prev => ({ ...prev, store_owner: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="store_phone" className="form-label">Owner Phone Number</label>
                      <input
                        id="store_phone"
                        className="form-control"
                        value={formData.store_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, store_phone: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="store_email" className="form-label">Owner Email</label>
                      <input
                        id="store_email"
                        className="form-control"
                        type="email"
                        value={formData.store_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, store_email: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={12}>
                    <div className="mb-3">
                      <label htmlFor="store_address" className="form-label">Store Address</label>
                      <textarea
                        id="store_address"
                        className="form-control"
                        rows={3}
                        value={formData.store_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, store_address: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={4}>
                    <div className="mb-3">
                      <label htmlFor="store_city" className="form-label">City</label>
                      <input
                        id="store_city"
                        className="form-control"
                        value={formData.store_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, store_city: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={4}>
                    <div className="mb-3">
                      <label htmlFor="store_zip" className="form-label">PIN Code</label>
                      <input
                        id="store_zip"
                        className="form-control"
                        value={formData.store_zip}
                        onChange={(e) => setFormData(prev => ({ ...prev, store_zip: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={4}>
                    <div className="mb-3">
                      <label htmlFor="store_country" className="form-label">Country</label>
                      <Form.Select id="store_country" value={INDIA_COUNTRY.code} disabled>
                        <option value={INDIA_COUNTRY.code}>{INDIA_COUNTRY.name}</option>
                      </Form.Select>
                    </div>
                  </Col>

                  <Col lg={12}>
                    <h6 className="text-muted text-uppercase mt-2">Billing Address</h6>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="billing_name" className="form-label">Billing Contact Name</label>
                      <input
                        id="billing_name"
                        className="form-control"
                        value={formData.billing_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_name: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="billing_phone" className="form-label">Billing Phone</label>
                      <input
                        id="billing_phone"
                        className="form-control"
                        value={formData.billing_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_phone: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={12}>
                    <div className="mb-3">
                      <label htmlFor="billing_address" className="form-label">Billing Address</label>
                      <textarea
                        id="billing_address"
                        className="form-control"
                        rows={3}
                        value={formData.billing_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_address: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={4}>
                    <div className="mb-3">
                      <label htmlFor="billing_city" className="form-label">City</label>
                      <input
                        id="billing_city"
                        className="form-control"
                        value={formData.billing_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_city: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={4}>
                    <div className="mb-3">
                      <label htmlFor="billing_state" className="form-label">State</label>
                      <Form.Select
                        id="billing_state"
                        value={normalizeIndiaStateCode(formData.billing_state)}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_state: e.target.value }))}
                      >
                        <option value="">Select state</option>
                        {INDIA_STATES.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.name}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                  </Col>
                  <Col lg={4}>
                    <div className="mb-3">
                      <label htmlFor="billing_zip" className="form-label">PIN Code</label>
                      <input
                        id="billing_zip"
                        className="form-control"
                        value={formData.billing_zip}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_zip: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="billing_country" className="form-label">Country</label>
                      <Form.Select id="billing_country" value={INDIA_COUNTRY.code} disabled>
                        <option value={INDIA_COUNTRY.code}>{INDIA_COUNTRY.name}</option>
                      </Form.Select>
                    </div>
                  </Col>
                </Row>
              </Tab>
              <Tab eventKey="coupons" title="Coupons">
                <Row className="mt-3">
                  <Col lg={6}>
                    <Form.Check
                      type="switch"
                      id="coupon_enabled"
                      label="Enable the use of coupon codes"
                      checked={!!formData.coupon_enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, coupon_enabled: e.target.checked }))}
                    />
                  </Col>
                  <Col lg={6}>
                    <Form.Check
                      type="switch"
                      id="coupon_sequential"
                      label="Calculate coupon discounts sequentially"
                      checked={!!formData.coupon_sequential}
                      onChange={(e) => setFormData(prev => ({ ...prev, coupon_sequential: e.target.checked }))}
                    />
                  </Col>
                </Row>
              </Tab>
              <Tab eventKey="products" title="Products">
                <Row className="mt-3">
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="product_weight_unit" className="form-label">Weight Unit</label>
                      <Form.Select
                        id="product_weight_unit"
                        value={formData.product_weight_unit}
                        onChange={(e) => setFormData(prev => ({ ...prev, product_weight_unit: e.target.value }))}>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                      </Form.Select>
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="product_dimensions_unit" className="form-label">Dimensions Unit</label>
                      <Form.Select
                        id="product_dimensions_unit"
                        value={formData.product_dimensions_unit}
                        onChange={(e) => setFormData(prev => ({ ...prev, product_dimensions_unit: e.target.value }))}>
                        <option value="cm">Centimeter (cm)</option>
                        <option value="mm">Millimeter (mm)</option>
                      </Form.Select>
                    </div>
                  </Col>
                </Row>
              </Tab>
              <Tab eventKey="shipping" title="Shipping">
                <Row className="mt-3">
                  <Col lg={6}>
                    <Form.Check
                      type="switch"
                      id="shipping_enabled"
                      label="Enable shipping rates"
                      checked={!!formData.shipping_enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, shipping_enabled: e.target.checked }))}
                    />
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="shipping_free_threshold" className="form-label">Free shipping threshold</label>
                      <input
                        id="shipping_free_threshold"
                        className="form-control"
                        type="number"
                        value={formData.shipping_free_threshold}
                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_free_threshold: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="shipping_flat_rate" className="form-label">Default flat rate</label>
                      <input
                        id="shipping_flat_rate"
                        className="form-control"
                        type="number"
                        value={formData.shipping_flat_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_flat_rate: e.target.value }))}
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="shipping_handling_days" className="form-label">Handling time</label>
                      <input
                        id="shipping_handling_days"
                        className="form-control"
                        placeholder="2-4 business days"
                        value={formData.shipping_handling_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_handling_days: e.target.value }))}
                      />
                    </div>
                  </Col>
                </Row>
              </Tab>
              <Tab eventKey="identity" title="Site Identity">
                <Row className="mt-3">
                  <Col lg={6}>
                    <div className="mb-3">
                      <label className="form-label d-block">Dark Logo (Header)</label>
                      {formData.site_logo_dark ? (
                        <div className="position-relative d-inline-block">
                          <img
                            src={resolveMediaUrl(formData.site_logo_dark)}
                            alt="Dark Logo"
                            className="rounded border bg-white"
                            style={{ width: 140, height: 60, objectFit: 'contain' }}
                          />
                          <Button
                            type="button"
                            variant="light"
                            className="position-absolute top-0 start-100 translate-middle p-0 rounded-circle border"
                            style={{ width: 26, height: 26 }}
                            onClick={() => setFormData(prev => ({ ...prev, site_logo_dark: '' }))}
                            title="Remove logo"
                          >
                            <IconifyIcon icon="mdi:close" width={16} height={16} />
                          </Button>
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          <DropzoneFormInput
                            text="Drag & drop dark logo here, or click to upload"
                            textClassName="fs-6"
                            className="py-4"
                            iconProps={{ icon: 'bx:cloud-upload', width: 28, height: 28 }}
                            showPreview={false}
                            maxFiles={1}
                            onFileUpload={(files) => uploadLogo(files, 'site_logo_dark')}
                          />
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setMediaTarget('site_logo_dark')
                              setShowMediaPicker(true)
                            }}
                          >
                            Choose from Media Library
                          </Button>
                        </div>
                      )}
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label className="form-label d-block">Light Logo (Footer)</label>
                      {formData.site_logo_light ? (
                        <div className="position-relative d-inline-block">
                          <img
                            src={resolveMediaUrl(formData.site_logo_light)}
                            alt="Light Logo"
                            className="rounded border bg-dark"
                            style={{ width: 140, height: 60, objectFit: 'contain' }}
                          />
                          <Button
                            type="button"
                            variant="light"
                            className="position-absolute top-0 start-100 translate-middle p-0 rounded-circle border"
                            style={{ width: 26, height: 26 }}
                            onClick={() => setFormData(prev => ({ ...prev, site_logo_light: '' }))}
                            title="Remove logo"
                          >
                            <IconifyIcon icon="mdi:close" width={16} height={16} />
                          </Button>
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          <DropzoneFormInput
                            text="Drag & drop light logo here, or click to upload"
                            textClassName="fs-6"
                            className="py-4"
                            iconProps={{ icon: 'bx:cloud-upload', width: 28, height: 28 }}
                            showPreview={false}
                            maxFiles={1}
                            onFileUpload={(files) => uploadLogo(files, 'site_logo_light')}
                          />
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setMediaTarget('site_logo_light')
                              setShowMediaPicker(true)
                            }}
                          >
                            Choose from Media Library
                          </Button>
                        </div>
                      )}
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label className="form-label d-block">Favicon</label>
                      {formData.site_favicon ? (
                        <div className="position-relative d-inline-block">
                          <img
                            src={resolveMediaUrl(formData.site_favicon)}
                            alt="Favicon"
                            className="rounded border bg-white"
                            style={{ width: 64, height: 64, objectFit: 'contain' }}
                          />
                          <Button
                            type="button"
                            variant="light"
                            className="position-absolute top-0 start-100 translate-middle p-0 rounded-circle border"
                            style={{ width: 22, height: 22 }}
                            onClick={() => setFormData(prev => ({ ...prev, site_favicon: '' }))}
                            title="Remove favicon"
                          >
                            <IconifyIcon icon="mdi:close" width={14} height={14} />
                          </Button>
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          <DropzoneFormInput
                            text="Drag & drop favicon here, or click to upload"
                            textClassName="fs-6"
                            className="py-4"
                            iconProps={{ icon: 'bx:cloud-upload', width: 28, height: 28 }}
                            showPreview={false}
                            maxFiles={1}
                            onFileUpload={(files) => uploadLogo(files, 'site_favicon')}
                          />
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setMediaTarget('site_favicon')
                              setShowMediaPicker(true)
                            }}
                          >
                            Choose from Media Library
                          </Button>
                        </div>
                      )}
                      <Form.Text className="text-muted">Recommended size: 32x32 or 64x64</Form.Text>
                    </div>
                  </Col>
                </Row>
              </Tab>
              </Tabs>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        multiple={false}
        usedIn="product"
        onSelect={(items) => {
          const selected = items[0]
          if (!selected?.url || !mediaTarget) return
          setFormData((prev) => ({ ...prev, [mediaTarget]: selected.url }))
        }}
      />
    </>
  )
}

export default EcommerceSettings
