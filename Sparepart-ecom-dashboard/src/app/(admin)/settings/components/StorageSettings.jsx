'use client'
import { settingsAPI } from '@/helpers/settingsApi'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, CardHeader, CardTitle, Col, Row, Spinner, Button, Form } from 'react-bootstrap'
import { toast } from 'react-toastify'

const StorageSettings = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    storage_driver: 'local',
    aws_region: '',
    aws_s3_bucket: '',
    aws_access_key_id: '',
    aws_secret_access_key: ''
  })

  useEffect(() => {
    const fetchSettings = async () => {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }
      try {
        const response = await settingsAPI.list('storage', session.accessToken)
        const data = response.data || response
        setFormData(prev => ({
          ...prev,
          storage_driver: data.storage_driver || 'local',
          aws_region: data.aws_region || '',
          aws_s3_bucket: data.aws_s3_bucket || '',
          aws_access_key_id: data.aws_access_key_id || '',
          aws_secret_access_key: data.aws_secret_access_key || ''
        }))
      } catch (error) {
        console.error('Failed to fetch storage settings', error)
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
      await settingsAPI.update({
        storage_driver: formData.storage_driver,
        aws_region: formData.aws_region,
        aws_s3_bucket: formData.aws_s3_bucket,
        aws_access_key_id: formData.aws_access_key_id,
        aws_secret_access_key: formData.aws_secret_access_key,
      }, session.accessToken)
      toast.success('Storage settings saved successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save storage settings')
    }
  }

  if (loading) return <div className="text-center py-3"><Spinner size="sm" /></div>

  const isS3 = formData.storage_driver === 's3'

  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:cloud-storage-bold-duotone" className="text-primary fs-20" />
              Storage Settings
            </CardTitle>
            <Button size="sm" variant="success" onClick={handleSave}>Save</Button>
          </CardHeader>
          <CardBody>
            <div className="mb-3">
              <label className="form-label d-block">Storage Driver</label>
              <div className="d-flex gap-3 flex-wrap">
                <Form.Check
                  type="radio"
                  id="storage-driver-local"
                  name="storage_driver"
                  value="local"
                  label="Local Storage"
                  checked={formData.storage_driver === 'local'}
                  onChange={handleChange}
                />
                <Form.Check
                  type="radio"
                  id="storage-driver-s3"
                  name="storage_driver"
                  value="s3"
                  label="AWS S3"
                  checked={formData.storage_driver === 's3'}
                  onChange={handleChange}
                />
              </div>
              <div className="text-muted small mt-2">
                Switching affects only new uploads. Existing images remain accessible.
              </div>
            </div>

            {isS3 && (
              <Row className="g-3">
                <Col lg={6}>
                  <label htmlFor="aws_region" className="form-label">AWS Region</label>
                  <input
                    id="aws_region"
                    name="aws_region"
                    type="text"
                    className="form-control"
                    placeholder="ap-south-1"
                    value={formData.aws_region}
                    onChange={handleChange}
                  />
                </Col>
                <Col lg={6}>
                  <label htmlFor="aws_s3_bucket" className="form-label">AWS S3 Bucket</label>
                  <input
                    id="aws_s3_bucket"
                    name="aws_s3_bucket"
                    type="text"
                    className="form-control"
                    placeholder="sparepart-prod-media"
                    value={formData.aws_s3_bucket}
                    onChange={handleChange}
                  />
                </Col>
                <Col lg={6}>
                  <label htmlFor="aws_access_key_id" className="form-label">AWS Access Key ID</label>
                  <input
                    id="aws_access_key_id"
                    name="aws_access_key_id"
                    type="text"
                    className="form-control"
                    placeholder="AKIA..."
                    value={formData.aws_access_key_id}
                    onChange={handleChange}
                  />
                </Col>
                <Col lg={6}>
                  <label htmlFor="aws_secret_access_key" className="form-label">AWS Secret Access Key</label>
                  <input
                    id="aws_secret_access_key"
                    name="aws_secret_access_key"
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={formData.aws_secret_access_key}
                    onChange={handleChange}
                  />
                </Col>
              </Row>
            )}
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default StorageSettings
