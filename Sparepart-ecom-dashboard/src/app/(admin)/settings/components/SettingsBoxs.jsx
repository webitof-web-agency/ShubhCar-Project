'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { settingsAPI } from '@/helpers/settingsApi'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Row, Spinner } from 'react-bootstrap'

const SettingsBoxs = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    category_product_count: true,
    category_items_per_page: 12,
    reviews_allow: true,
    reviews_allow_guest: false,
    vouchers_min: 1,
    vouchers_max: 12,
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
          category_product_count: data.category_product_count ?? prev.category_product_count,
          category_items_per_page: data.category_items_per_page ?? prev.category_items_per_page,
          reviews_allow: data.reviews_allow ?? prev.reviews_allow,
          reviews_allow_guest: data.reviews_allow_guest ?? prev.reviews_allow_guest,
          vouchers_min: data.vouchers_min ?? prev.vouchers_min,
          vouchers_max: data.vouchers_max ?? prev.vouchers_max,
        }))
      } catch (error) {
        console.error('Failed to fetch settings boxes', error)
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
          category_product_count: formData.category_product_count,
          category_items_per_page: Number(formData.category_items_per_page || 0),
          reviews_allow: formData.reviews_allow,
          reviews_allow_guest: formData.reviews_allow_guest,
          vouchers_min: Number(formData.vouchers_min || 0),
          vouchers_max: Number(formData.vouchers_max || 0),
        },
        session.accessToken
      )
      toast.success('Settings updated successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to update settings')
    }
  }

  if (loading) return <div className="text-center py-3"><Spinner size="sm" /></div>

  return (
    <Row>
      <Col lg={3}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1 mb-0">
              <IconifyIcon icon="solar:box-bold-duotone" className="text-primary fs-20" />
              Categories Settings
            </CardTitle>
            <Button size="sm" variant="success" onClick={handleSave}>Save</Button>
          </CardHeader>
          <CardBody>
            <p>Category Product Count</p>
            <div className="d-flex gap-2 align-items-center mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="category_product_count"
                  id="category_product_count_yes"
                  checked={!!formData.category_product_count}
                  onChange={() => setFormData(prev => ({ ...prev, category_product_count: true }))}
                />
                <label className="form-check-label" htmlFor="category_product_count_yes">
                  Yes
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="category_product_count"
                  id="category_product_count_no"
                  checked={!formData.category_product_count}
                  onChange={() => setFormData(prev => ({ ...prev, category_product_count: false }))}
                />
                <label className="form-check-label" htmlFor="category_product_count_no">
                  No
                </label>
              </div>
            </div>
            <div className="mb-1 pb-1">
              <label htmlFor="items-par-page" className="form-label">
                Default Items Per Page
              </label>
              <input
                type="number"
                id="items-par-page"
                className="form-control"
                placeholder="12"
                value={formData.category_items_per_page}
                onChange={(e) => setFormData(prev => ({ ...prev, category_items_per_page: e.target.value }))}
              />
            </div>
          </CardBody>
        </Card>
      </Col>
      <Col lg={3}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1 mb-0">
              <IconifyIcon icon="solar:chat-square-check-bold-duotone" className="text-primary fs-20" />
              Reviews Settings
            </CardTitle>
            <Button size="sm" variant="success" onClick={handleSave}>Save</Button>
          </CardHeader>
          <CardBody>
            <p>Allow Reviews</p>
            <div className="d-flex gap-2 align-items-center mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="reviews_allow"
                  id="reviews_allow_yes"
                  checked={!!formData.reviews_allow}
                  onChange={() => setFormData(prev => ({ ...prev, reviews_allow: true }))}
                />
                <label className="form-check-label" htmlFor="reviews_allow_yes">
                  Yes
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="reviews_allow"
                  id="reviews_allow_no"
                  checked={!formData.reviews_allow}
                  onChange={() => setFormData(prev => ({ ...prev, reviews_allow: false }))}
                />
                <label className="form-check-label" htmlFor="reviews_allow_no">
                  No
                </label>
              </div>
            </div>
            <p className="mt-3 pt-1">Allow Guest Reviews</p>
            <div className="d-flex gap-2 align-items-center mb-2">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="reviews_allow_guest"
                  id="reviews_allow_guest_yes"
                  checked={!!formData.reviews_allow_guest}
                  onChange={() => setFormData(prev => ({ ...prev, reviews_allow_guest: true }))}
                />
                <label className="form-check-label" htmlFor="reviews_allow_guest_yes">
                  Yes
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="reviews_allow_guest"
                  id="reviews_allow_guest_no"
                  checked={!formData.reviews_allow_guest}
                  onChange={() => setFormData(prev => ({ ...prev, reviews_allow_guest: false }))}
                />
                <label className="form-check-label" htmlFor="reviews_allow_guest_no">
                  No
                </label>
              </div>
            </div>
          </CardBody>
        </Card>
      </Col>
      <Col lg={3}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1 mb-0">
              <IconifyIcon icon="solar:ticket-bold-duotone" className="text-primary fs-20" />
              Vouchers Settings
            </CardTitle>
            <Button size="sm" variant="success" onClick={handleSave}>Save</Button>
          </CardHeader>
          <CardBody>
            <div className="mb-3">
              <label htmlFor="min-vouchers" className="form-label">
                Minimum Vouchers
              </label>
              <input
                type="number"
                id="min-vouchers"
                className="form-control"
                placeholder="1"
                value={formData.vouchers_min}
                onChange={(e) => setFormData(prev => ({ ...prev, vouchers_min: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="mex-vouchers" className="form-label">
                Maximum Vouchers
              </label>
              <input
                type="number"
                id="mex-vouchers"
                className="form-control"
                placeholder="12"
                value={formData.vouchers_max}
                onChange={(e) => setFormData(prev => ({ ...prev, vouchers_max: e.target.value }))}
              />
            </div>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default SettingsBoxs
