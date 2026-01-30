'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { settingsAPI } from '@/helpers/settingsApi'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Row, Spinner } from 'react-bootstrap'

const CustomersSettings = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    customer_guest_checkout: false,
    customer_max_login_attempts: '1 hour',
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
        setFormData(prev => ({
          ...prev,
          customer_guest_checkout: data.customer_guest_checkout ?? prev.customer_guest_checkout,
          customer_max_login_attempts: data.customer_max_login_attempts || prev.customer_max_login_attempts,
        }))
      } catch (error) {
        console.error('Failed to fetch customer settings', error)
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
          customer_guest_checkout: formData.customer_guest_checkout,
          customer_max_login_attempts: formData.customer_max_login_attempts,
        },
        session.accessToken
      )
      toast.success('Customer settings saved successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save customer settings')
    }
  }

  if (loading) return <div className="text-center py-3"><Spinner size="sm" /></div>

  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1 mb-0">
              <IconifyIcon icon="solar:users-group-two-rounded-bold-duotone" className="text-primary fs-20" />
              Customers Settings
            </CardTitle>
            <Button size="sm" variant="success" onClick={handleSave}>Save Changes</Button>
          </CardHeader>
          <CardBody>
            <Row className="justify-content-between g-3">
              <Col lg={6} className="border-end">
                <p>Allow Guest Checkout</p>
                <div className="d-flex gap-2 align-items-center">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="customer_guest_checkout"
                      id="customer_guest_checkout_yes"
                      checked={!!formData.customer_guest_checkout}
                      onChange={() => setFormData(prev => ({ ...prev, customer_guest_checkout: true }))}
                    />
                    <label className="form-check-label" htmlFor="customer_guest_checkout_yes">
                      Yes
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="customer_guest_checkout"
                      id="customer_guest_checkout_no"
                      checked={!formData.customer_guest_checkout}
                      onChange={() => setFormData(prev => ({ ...prev, customer_guest_checkout: false }))}
                    />
                    <label className="form-check-label" htmlFor="customer_guest_checkout_no">
                      No
                    </label>
                  </div>
                </div>
              </Col>
            </Row>
            <Row className="mt-3">
              <Col lg={6}>
                <div>
                  <label htmlFor="login-attempts" className="form-label">
                    Max Login Attempts
                  </label>
                  <input
                    type="text"
                    id="login-attempts"
                    className="form-control"
                    placeholder="max"
                    value={formData.customer_max_login_attempts}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_max_login_attempts: e.target.value }))}
                  />
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default CustomersSettings
