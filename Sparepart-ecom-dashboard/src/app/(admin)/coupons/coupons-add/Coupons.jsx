'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PageTItle from '@/components/PageTItle'
import { Button, Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Row, Alert, Spinner, Form } from 'react-bootstrap'
import couponService from '@/services/couponService'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const Coupons = () => {
  const { data: session } = useSession()
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percent',
    discountValue: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimitTotal: '',
    usageLimitPerUser: '',
    validFrom: '',
    validTo: '',
    isActive: true,
  })

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validation
    if (!formData.code) {
      setError('Coupon code is required')
      return
    }
    if (!formData.discountValue || formData.discountValue <= 0) {
      setError('Discount value must be greater than 0')
      return
    }
    if (!formData.validFrom || !formData.validTo) {
      setError('Start and end dates are required')
      return
    }

    const token = session?.accessToken
    if (!token) {
      setError('You must be logged in to create coupons')
      return
    }

    try {
      setSubmitting(true)

      // Prepare coupon data
      const couponData = {
        code: formData.code.toUpperCase(),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        usageLimitTotal: formData.usageLimitTotal ? parseInt(formData.usageLimitTotal) : null,
        usageLimitPerUser: formData.usageLimitPerUser ? parseInt(formData.usageLimitPerUser) : null,
        // Convert Date objects to ISO strings for API
        validFrom: formData.validFrom instanceof Date ? formData.validFrom.toISOString() : new Date(formData.validFrom).toISOString(),
        validTo: formData.validTo instanceof Date ? formData.validTo.toISOString() : new Date(formData.validTo).toISOString(),
        isActive: formData.isActive,
      }

      await couponService.createCoupon(couponData, token)

      setSuccess('Coupon created successfully!')
      
      // Reset form
      setFormData({
        code: '',
        discountType: 'percent',
        discountValue: '',
        minOrderAmount: '',
        maxDiscountAmount: '',
        usageLimitTotal: '',
        usageLimitPerUser: '',
        validFrom: '',
        validTo: '',
        isActive: true,
      })

      // Redirect to list after 2 seconds
      setTimeout(() => {
        router.push('/coupons/coupons-list')
      }, 2000)
    } catch (err) {
      console.error('Error creating coupon:', err)
      setError(err.message || 'Failed to create coupon')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageTItle title="ADD COUPON" />
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Row>
          <Col lg={5}>
            <Card>
              <CardHeader>
                <CardTitle as={'h4'}>Coupon Status</CardTitle>
              </CardHeader>
              <CardBody>
                <Form.Check
                  type="switch"
                  id="isActive"
                  name="isActive"
                  label="Active"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle as={'h4'}>Date Schedule</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="mb-3">
                  <label htmlFor="validFrom" className="form-label text-dark">
                    Start Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    id="validFrom"
                    name="validFrom"
                    className="form-control"
                    value={formData.validFrom ? (formData.validFrom instanceof Date ? formData.validFrom.toISOString().split('T')[0] : formData.validFrom.split('T')[0]) : ''}
                    onChange={(e) => {
                      const dateValue = e.target.value ? new Date(e.target.value) : ''
                      setFormData(prev => ({ ...prev, validFrom: dateValue }))
                    }}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="validTo" className="form-label text-dark">
                    End Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    id="validTo"
                    name="validTo"
                    className="form-control"
                    value={formData.validTo ? (formData.validTo instanceof Date ? formData.validTo.toISOString().split('T')[0] : formData.validTo.split('T')[0]) : ''}
                    onChange={(e) => {
                      const dateValue = e.target.value ? new Date(e.target.value) : ''
                      setFormData(prev => ({ ...prev, validTo: dateValue }))
                    }}
                    required
                  />
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col lg={7}>
            <Card>
              <CardHeader>
                <CardTitle as={'h4'}>Coupon Information</CardTitle>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="code" className="form-label">
                        Coupon Code <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="code"
                        name="code"
                        className="form-control"
                        placeholder="e.g., SAVE20"
                        value={formData.code}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="discountValue" className="form-label">
                        Discount Value <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        id="discountValue"
                        name="discountValue"
                        className="form-control"
                        placeholder="e.g., 20"
                        value={formData.discountValue}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  </Col>
                </Row>

                <CardTitle as={'h5'} className="mb-3 mt-2">
                  <IconifyIcon icon="solar:discount-check-bold" className="me-2" />
                  Discount Type
                </CardTitle>
                <Row className="mb-3">
                  <Col lg={6}>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="discountType"
                        id="percent"
                        value="percent"
                        checked={formData.discountType === 'percent'}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="percent">
                        Percentage (%)
                      </label>
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="discountType"
                        id="flat"
                        value="flat"
                        checked={formData.discountType === 'flat'}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="flat">
                        Flat Amount (₹)
                      </label>
                    </div>
                  </Col>
                </Row>

                <CardTitle as={'h5'} className="mb-3 mt-3">
                  <IconifyIcon icon="solar:settings-bold" className="me-2" />
                  Limits & Restrictions
                </CardTitle>
                <Row>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="minOrderAmount" className="form-label">
                        Minimum Order Amount (₹)
                      </label>
                      <input
                        type="number"
                        id="minOrderAmount"
                        name="minOrderAmount"
                        className="form-control"
                        placeholder="0"
                        value={formData.minOrderAmount}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="maxDiscountAmount" className="form-label">
                        Max Discount Amount (₹)
                      </label>
                      <input
                        type="number"
                        id="maxDiscountAmount"
                        name="maxDiscountAmount"
                        className="form-control"
                        placeholder="Optional"
                        value={formData.maxDiscountAmount}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="usageLimitTotal" className="form-label">
                        Total Usage Limit
                      </label>
                      <input
                        type="number"
                        id="usageLimitTotal"
                        name="usageLimitTotal"
                        className="form-control"
                        placeholder="Unlimited"
                        value={formData.usageLimitTotal}
                        onChange={handleChange}
                        min="1"
                      />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <div className="mb-3">
                      <label htmlFor="usageLimitPerUser" className="form-label">
                        Usage Limit Per User
                      </label>
                      <input
                        type="number"
                        id="usageLimitPerUser"
                        name="usageLimitPerUser"
                        className="form-control"
                        placeholder="Unlimited"
                        value={formData.usageLimitPerUser}
                        onChange={handleChange}
                        min="1"
                      />
                    </div>
                  </Col>
                </Row>
              </CardBody>
              <CardFooter className="border-top">
                <Button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <IconifyIcon icon="solar:add-circle-broken" className="me-2" />
                      Create Coupon
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </Col>
        </Row>
      </form>
    </>
  )
}

export default Coupons
