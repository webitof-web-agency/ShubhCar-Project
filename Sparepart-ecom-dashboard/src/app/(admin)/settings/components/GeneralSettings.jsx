'use client'
import { settingsAPI } from '@/helpers/settingsApi'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, CardHeader, CardTitle, Col, Row, Spinner, Button } from 'react-bootstrap'
import { toast } from 'react-toastify'

const GeneralSettings = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    site_title: '',
    site_description: '',
    contact_email: '',
    contact_phone: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: ''
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
          site_title: data.site_title || '',
          site_description: data.site_description || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          seo_title: data.seo_title || '',
          seo_description: data.seo_description || '',
          seo_keywords: data.seo_keywords || ''
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
      toast.success("Settings saved successfully!")
    } catch (error) {
      console.error(error)
      toast.error("Failed to save settings")
    }
  }

  if (loading) return <div className="text-center py-3"><Spinner size="sm" /></div>

  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:settings-bold-duotone" className="text-primary fs-20" />
              General Settings
            </CardTitle>
            <Button size="sm" variant="success" onClick={handleSave}>Save Changes</Button>
          </CardHeader>
          <CardBody>
            <Row>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="site_title" className="form-label">
                    Site Title
                  </label>
                  <input
                    type="text"
                    id="site_title"
                    name="site_title"
                    className="form-control"
                    placeholder="Site Title"
                    value={formData.site_title}
                    onChange={handleChange}
                  />
                </div>
              </Col>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="contact_email" className="form-label">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    id="contact_email"
                    name="contact_email"
                    className="form-control"
                    placeholder="Email"
                    value={formData.contact_email}
                    onChange={handleChange}
                  />
                </div>
              </Col>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="contact_phone" className="form-label">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    id="contact_phone"
                    name="contact_phone"
                    className="form-control"
                    placeholder="Phone"
                    value={formData.contact_phone}
                    onChange={handleChange}
                  />
                </div>
              </Col>
              <Col lg={12}>
                <div>
                  <label htmlFor="site_description" className="form-label">
                    Site Description
                  </label>
                  <textarea
                    className="form-control bg-light-subtle"
                    id="site_description"
                    name="site_description"
                    rows={4}
                    placeholder="Type description"
                    value={formData.site_description}
                    onChange={handleChange}
                  />
                </div>
              </Col>
              <Col lg={12}>
                <hr className="my-3" />
              </Col>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="seo_title" className="form-label">
                    SEO Title
                  </label>
                  <input
                    type="text"
                    id="seo_title"
                    name="seo_title"
                    className="form-control"
                    placeholder="SEO Title"
                    value={formData.seo_title}
                    onChange={handleChange}
                  />
                </div>
              </Col>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="seo_keywords" className="form-label">
                    SEO Keywords
                  </label>
                  <input
                    type="text"
                    id="seo_keywords"
                    name="seo_keywords"
                    className="form-control"
                    placeholder="comma, separated, keywords"
                    value={formData.seo_keywords}
                    onChange={handleChange}
                  />
                </div>
              </Col>
              <Col lg={12}>
                <div>
                  <label htmlFor="seo_description" className="form-label">
                    SEO Description
                  </label>
                  <textarea
                    className="form-control bg-light-subtle"
                    id="seo_description"
                    name="seo_description"
                    rows={3}
                    placeholder="Meta description"
                    value={formData.seo_description}
                    onChange={handleChange}
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
export default GeneralSettings
