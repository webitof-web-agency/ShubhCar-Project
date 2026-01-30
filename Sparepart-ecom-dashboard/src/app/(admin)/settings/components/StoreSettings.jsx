'use client'
import { toast } from 'react-toastify'
import ChoicesFormInput from '@/components/form/ChoicesFormInput'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, CardHeader, CardTitle, Col, Row, Spinner, Button } from 'react-bootstrap'
import { settingsAPI } from '@/helpers/settingsApi'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { INDIA_COUNTRY } from '@/helpers/indiaRegions'

const StoreSettings = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    store_name: '',
    store_owner: '',
    store_phone: '',
    store_email: '',
    store_address: '',
    store_zip: '',
    store_city: '',
    store_country: INDIA_COUNTRY.code
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
          store_name: data.store_name || '',
          store_owner: data.store_owner || '',
          store_phone: data.store_phone || '',
          store_email: data.store_email || '',
          store_address: data.store_address || '',
          store_zip: data.store_zip || '',
          store_city: data.store_city || '',
          store_country: INDIA_COUNTRY.code
        }))
      } catch (error) {
        console.error("Failed to fetch settings", error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [session])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!session?.accessToken) return
    try {
      await settingsAPI.update(formData, session.accessToken)
      toast.success("Store settings saved successfully!")
    } catch (error) {
      console.error(error)
      toast.error("Failed to save store settings")
    }
  }

  if (loading) return <div className="text-center py-3"><Spinner size="sm" /></div>

  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:shop-2-bold-duotone" className="text-primary fs-20" />
              Store Settings
            </CardTitle>
            <Button size="sm" variant="success" onClick={handleSave}>Save Changes</Button>
          </CardHeader>
          <CardBody>
            <Row>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="store_name" className="form-label">
                    Store Name
                  </label>
                  <input type="text" id="store_name" name="store_name" className="form-control" placeholder="Enter name" value={formData.store_name} onChange={handleChange} />
                </div>
              </Col>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="store_owner" className="form-label">
                    Store Owner Full Name
                  </label>
                  <input type="text" id="store_owner" name="store_owner" className="form-control" placeholder="Full name" value={formData.store_owner} onChange={handleChange} />
                </div>
              </Col>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="store_phone" className="form-label">
                    Owner Phone number
                  </label>
                  <input type="text" id="store_phone" name="store_phone" className="form-control" placeholder="Number" value={formData.store_phone} onChange={handleChange} />
                </div>
              </Col>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="store_email" className="form-label">
                    Owner Email
                  </label>
                  <input type="email" id="store_email" name="store_email" className="form-control" placeholder="Email" value={formData.store_email} onChange={handleChange} />
                </div>
              </Col>
              <Col lg={12}>
                <div className="mb-3">
                  <label htmlFor="store_address" className="form-label">
                    Full Address
                  </label>
                  <textarea className="form-control bg-light-subtle" id="store_address" name="store_address" rows={3} placeholder="Type address" value={formData.store_address} onChange={handleChange} />
                </div>
              </Col>
              <Col lg={4}>
                <div className="mb-3">
                  <label htmlFor="store_zip" className="form-label">
                    PIN Code
                  </label>
                  <input type="number" id="store_zip" name="store_zip" className="form-control" placeholder="PIN code" value={formData.store_zip} onChange={handleChange} />
                </div>
              </Col>
              <Col lg={4}>
                <div className="mb-3">
                  <label htmlFor="store_city" className="form-label">
                    City
                  </label>
                  <input type="text" id="store_city" name="store_city" className="form-control" placeholder="City" value={formData.store_city} onChange={handleChange} />
                </div>
              </Col>
              <Col lg={4}>
                <div className="mb-3">
                  <label htmlFor="store_country" className="form-label">
                    Country
                  </label>
                  <select id="store_country" name="store_country" className="form-select" value={INDIA_COUNTRY.code} disabled>
                    <option value={INDIA_COUNTRY.code}>{INDIA_COUNTRY.name}</option>
                  </select>
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}
export default StoreSettings
