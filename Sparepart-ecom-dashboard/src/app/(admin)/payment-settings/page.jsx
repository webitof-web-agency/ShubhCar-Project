'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Row, Spinner, Alert } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { settingsAPI } from '@/helpers/settingsApi'

const PaymentSettingsPage = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    payment_cod_enabled: true,
    payment_razorpay_enabled: false,
    razorpay_key_id: '',
    razorpay_key_secret: '',
  })

  useEffect(() => {
    const fetchSettings = async () => {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }
      try {
        setError('')
        const response = await settingsAPI.list('payment', session.accessToken)
        const data = response.data || response
        const toBool = (value, fallback) => {
          if (value === true || value === 'true' || value === 1 || value === '1') return true
          if (value === false || value === 'false' || value === 0 || value === '0') return false
          return fallback
        }
        setFormData(prev => ({
          ...prev,
          payment_cod_enabled: toBool(data.payment_cod_enabled, prev.payment_cod_enabled),
          payment_razorpay_enabled: toBool(data.payment_razorpay_enabled, prev.payment_razorpay_enabled),
          razorpay_key_id: data.razorpay_key_id || '',
          razorpay_key_secret: data.razorpay_key_secret || '',
        }))
      } catch (err) {
        console.error('Failed to load payment settings', err)
        setError(err.message || 'Failed to load payment settings')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [session])

  const handleSave = async () => {
    if (!session?.accessToken) return
    setSaving(true)
    try {
      await settingsAPI.update(
        {
          payment_cod_enabled: !!formData.payment_cod_enabled,
          payment_razorpay_enabled: !!formData.payment_razorpay_enabled,
          razorpay_key_id: formData.razorpay_key_id || '',
          razorpay_key_secret: formData.razorpay_key_secret || '',
        },
        session.accessToken
      )
      toast.success('Payment settings saved successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save payment settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <CardTitle as="h4" className="mb-0 d-flex align-items-center gap-2">
              <IconifyIcon icon="solar:card-2-bold-duotone" className="text-primary fs-20" />
              Payment Settings
            </CardTitle>
            <Button variant="success" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardHeader>
          <CardBody>
            {error && <Alert variant="danger">{error}</Alert>}
            <Row className="g-4">
              <Col lg={6}>
                <Card className="border shadow-none">
                  <CardBody>
                    <h6 className="mb-2">Cash on Delivery (COD)</h6>
                    <p className="text-muted small mb-3">
                      Enable COD to allow customers to pay at delivery. Disabled methods will be hidden at checkout.
                    </p>
                    <Form.Check
                      type="switch"
                      id="payment_cod_enabled"
                      label={formData.payment_cod_enabled ? 'Enabled' : 'Disabled'}
                      checked={!!formData.payment_cod_enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_cod_enabled: e.target.checked }))}
                    />
                  </CardBody>
                </Card>
              </Col>
              <Col lg={6}>
                <Card className="border shadow-none">
                  <CardBody>
                    <h6 className="mb-2">Razorpay</h6>
                    <p className="text-muted small mb-3">
                      Enable Razorpay to accept online payments. Provide live credentials for production transactions.
                    </p>
                    <Form.Check
                      type="switch"
                      id="payment_razorpay_enabled"
                      label={formData.payment_razorpay_enabled ? 'Enabled' : 'Disabled'}
                      checked={!!formData.payment_razorpay_enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_razorpay_enabled: e.target.checked }))}
                    />
                    {formData.payment_razorpay_enabled && (
                      <div className="mt-3">
                        <div className="mb-3">
                          <Form.Label>Razorpay Client ID</Form.Label>
                          <Form.Control
                            value={formData.razorpay_key_id}
                            onChange={(e) => setFormData(prev => ({ ...prev, razorpay_key_id: e.target.value }))}
                            placeholder="rzp_live_..."
                          />
                        </div>
                        <div className="mb-0">
                          <Form.Label>Razorpay Client Secret</Form.Label>
                          <Form.Control
                            type="password"
                            value={formData.razorpay_key_secret}
                            onChange={(e) => setFormData(prev => ({ ...prev, razorpay_key_secret: e.target.value }))}
                            placeholder="********"
                          />
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default PaymentSettingsPage
