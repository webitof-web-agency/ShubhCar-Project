'use client'
import ChoicesFormInput from '@/components/form/ChoicesFormInput'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { settingsAPI } from '@/helpers/settingsApi'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Row, Spinner } from 'react-bootstrap'

const LocalizationSettings = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    localization_country: 'India',
    localization_language: 'English',
    localization_currency: 'Indian Rupee',
    localization_length_unit: 'Centimeter',
    localization_weight_unit: 'Kilogram',
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
          localization_country: data.localization_country || 'India',
          localization_language: data.localization_language || 'English',
          localization_currency: data.localization_currency || 'Indian Rupee',
          localization_length_unit: data.localization_length_unit || 'Centimeter',
          localization_weight_unit: data.localization_weight_unit || 'Kilogram',
        }))
      } catch (error) {
        console.error('Failed to fetch localization settings', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [session])

  const handleSave = async () => {
    if (!session?.accessToken) return
    try {
      await settingsAPI.update(formData, session.accessToken)
      toast.success('Localization settings saved successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save localization settings')
    }
  }

  if (loading) return <div className="text-center py-3"><Spinner size="sm" /></div>

  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:compass-bold-duotone" className="text-primary fs-20" />
              Localization Settings
            </CardTitle>
            <Button size="sm" variant="success" onClick={handleSave}>Save Changes</Button>
          </CardHeader>
          <CardBody>
            <Row>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="choices-country1" className="form-label">
                    Country
                  </label>
                  <ChoicesFormInput
                    key={`country-${formData.localization_country}`}
                    className="form-control"
                    id="choices-country1"
                    data-choices
                    data-choices-groups
                    data-placeholder="Select Country"
                    value={formData.localization_country}
                    onChange={(value) => setFormData(prev => ({ ...prev, localization_country: value }))}>
                    <option value="">Choose a country</option>
                    <optgroup>
                      <option>India</option>
                    </optgroup>
                  </ChoicesFormInput>
                </div>
              </Col>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="choices-language" className="form-label">
                    Language
                  </label>
                  <ChoicesFormInput
                    key={`language-${formData.localization_language}`}
                    className="form-control"
                    id="choices-language"
                    data-choices
                    data-choices-groups
                    data-placeholder="Select language"
                    value={formData.localization_language}
                    onChange={(value) => setFormData(prev => ({ ...prev, localization_language: value }))}>
                    <option value="">English</option>
                    <optgroup>
                      <option>Hindi</option>
                      <option>English</option>
                    </optgroup>
                  </ChoicesFormInput>
                </div>
              </Col>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="choices-currency" className="form-label">
                    Currency
                  </label>
                  <ChoicesFormInput
                    key={`currency-${formData.localization_currency}`}
                    className="form-control"
                    id="choices-currency"
                    data-choices
                    data-choices-groups
                    data-placeholder="Select Currency"
                    value={formData.localization_currency}
                    onChange={(value) => setFormData(prev => ({ ...prev, localization_currency: value }))}>
                    <option value="">Indian Rupee (INR)</option>
                    <optgroup>
                      <option>Indian Rupee</option>
                    </optgroup>
                  </ChoicesFormInput>
                </div>
              </Col>
              <Col lg={6}>
                <div className="mb-3">
                  <label htmlFor="choices-length" className="form-label">
                    Length Class
                  </label>
                  <ChoicesFormInput
                    key={`length-${formData.localization_length_unit}`}
                    className="form-control"
                    id="choices-length"
                    data-choices
                    data-choices-groups
                    data-placeholder="Select Length"
                    value={formData.localization_length_unit}
                    onChange={(value) => setFormData(prev => ({ ...prev, localization_length_unit: value }))}>
                    <option value="">Centimeter</option>
                    <optgroup>
                      <option>Millimeter</option>
                    </optgroup>
                  </ChoicesFormInput>
                </div>
              </Col>
              <Col lg={6}>
                <div>
                  <label htmlFor="choices-weight" className="form-label">
                    Weight Class
                  </label>
                  <ChoicesFormInput
                    key={`weight-${formData.localization_weight_unit}`}
                    className="form-control"
                    id="choices-weight"
                    data-choices
                    data-choices-groups
                    data-placeholder="Select Weight"
                    value={formData.localization_weight_unit}
                    onChange={(value) => setFormData(prev => ({ ...prev, localization_weight_unit: value }))}>
                    <option value="">Kilogram</option>
                    <optgroup>
                      <option>Gram</option>
                    </optgroup>
                  </ChoicesFormInput>
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default LocalizationSettings
