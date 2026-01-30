'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL } from '@/helpers/apiBase'
import { Card, CardBody, CardHeader, Button, Form, Alert, Spinner, Row, Col, Nav, Tab } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'


const PrivacyPolicyForm = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [pageData, setPageData] = useState(null)
  const [activeTab, setActiveTab] = useState('basic')

  const [formData, setFormData] = useState({
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    description: '',
    sections: [],
    status: 'draft'
  })

  const [newSection, setNewSection] = useState({
    type: 'text',
    data: {
      heading: '',
      content: ''
    }
  })

  useEffect(() => {
    fetchPrivacyPolicy()
  }, [session])

  const fetchPrivacyPolicy = async () => {
    try {
      setLoading(true)
      const token = session?.accessToken

      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/pages?slug=privacy-policy`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data && data.data.length > 0) {
          const page = data.data[0]
          setPageData(page)
          setFormData({
            slug: page.slug || 'privacy-policy',
            title: page.title || 'Privacy Policy',
            description: page.description || '',
            sections: page.sections || [],
            status: page.status || 'draft'
          })
        }
      }
    } catch (err) {
      console.error('Error fetching privacy policy:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSectionChange = (index, field, value) => {
    const updatedSections = [...formData.sections]
    if (field === 'heading' || field === 'content') {
      updatedSections[index].data[field] = value
    } else {
      updatedSections[index][field] = value
    }
    setFormData(prev => ({
      ...prev,
      sections: updatedSections
    }))
  }

  const addSection = () => {
    if (!newSection.data.heading && !newSection.data.content) {
      setError('Please add heading or content for the section')
      return
    }

    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, { ...newSection }]
    }))

    setNewSection({
      type: 'text',
      data: {
        heading: '',
        content: ''
      }
    })
    setError(null)
  }

  const removeSection = (index) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }))
  }

  const moveSectionUp = (index) => {
    if (index === 0) return
    const updatedSections = [...formData.sections]
    const temp = updatedSections[index]
    updatedSections[index] = updatedSections[index - 1]
    updatedSections[index - 1] = temp
    setFormData(prev => ({
      ...prev,
      sections: updatedSections
    }))
  }

  const moveSectionDown = (index) => {
    if (index === formData.sections.length - 1) return
    const updatedSections = [...formData.sections]
    const temp = updatedSections[index]
    updatedSections[index] = updatedSections[index + 1]
    updatedSections[index + 1] = temp
    setFormData(prev => ({
      ...prev,
      sections: updatedSections
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const token = session?.accessToken
      if (!token) {
        setError('Please log in to save')
        setSaving(false)
        return
      }

      const url = pageData
        ? `${API_BASE_URL}/pages/${pageData._id}`
        : `${API_BASE_URL}/pages`

      const method = pageData ? 'PUT' : 'POST'

      console.log('Saving privacy policy:', formData)

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save privacy policy')
      }

      const data = await response.json()
      setPageData(data.data)
      setSuccess(pageData ? 'Privacy Policy updated successfully!' : 'Privacy Policy created successfully!')

      await fetchPrivacyPolicy()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setFormData(prev => ({ ...prev, status: 'published' }))
    setTimeout(() => {
      document.getElementById('privacy-form').requestSubmit()
    }, 100)
  }

  if (loading) {
    return (
      <Card>
        <CardBody className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Loading privacy policy...</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          <IconifyIcon icon="bx:error-circle" className="me-2" />
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="mb-3">
          <IconifyIcon icon="bx:check-circle" className="me-2" />
          {success}
        </Alert>
      )}

      <Form id="privacy-form" onSubmit={handleSubmit}>
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Card className="mb-3">
            <CardHeader>
              <Nav variant="tabs" className="nav-bordered">
                <Nav.Item>
                  <Nav.Link eventKey="basic">
                    <IconifyIcon icon="solar:document-text-bold" className="me-1" />
                    Basic Info
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="content">
                    <IconifyIcon icon="solar:layers-bold" className="me-1" />
                    Content ({formData.sections.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="preview">
                    <IconifyIcon icon="bx:show" className="me-1" />
                    Preview
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </CardHeader>
            <CardBody>
              <Tab.Content>
                <Tab.Pane eventKey="basic">
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">
                          Title <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Slug</Form.Label>
                        <Form.Control
                          type="text"
                          name="slug"
                          value={formData.slug}
                          readOnly
                          className="bg-light"
                        />
                        <Form.Text className="text-muted">
                          <IconifyIcon icon="bx:info-circle" className="me-1" />
                          Fixed to privacy-policy
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Optional introduction"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Status</Form.Label>
                        <Form.Select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Tab.Pane>

                <Tab.Pane eventKey="content">
                  {formData.sections.length > 0 && (
                    <div className="mb-4">
                      <h5 className="mb-3">Existing Sections</h5>
                      {formData.sections.map((section, index) => (
                        <Card key={index} className="mb-3">
                          <CardBody>
                            <div className="d-flex justify-content-between mb-3">
                              <h6>Section {index + 1}</h6>
                              <div className="btn-group btn-group-sm">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => moveSectionUp(index)}
                                  disabled={index === 0}
                                >
                                  <IconifyIcon icon="bx:chevron-up" />
                                </Button>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => moveSectionDown(index)}
                                  disabled={index === formData.sections.length - 1}
                                >
                                  <IconifyIcon icon="bx:chevron-down" />
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => removeSection(index)}
                                >
                                  <IconifyIcon icon="bx:trash" />
                                </Button>
                              </div>
                            </div>

                            <Form.Group className="mb-3">
                              <Form.Label>Heading</Form.Label>
                              <Form.Control
                                type="text"
                                value={section.data.heading || ''}
                                onChange={(e) => handleSectionChange(index, 'heading', e.target.value)}
                              />
                            </Form.Group>

                            <Form.Group>
                              <Form.Label>Content</Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={5}
                                value={section.data.content || ''}
                                onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                              />
                            </Form.Group>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  )}

                  <Card className="border-primary bg-light">
                    <CardBody>
                      <h5 className="mb-3">Add New Section</h5>
                      <Form.Group className="mb-3">
                        <Form.Label>Heading</Form.Label>
                        <Form.Control
                          type="text"
                          value={newSection.data.heading}
                          onChange={(e) => setNewSection(prev => ({
                            ...prev,
                            data: { ...prev.data, heading: e.target.value }
                          }))}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Content</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={5}
                          value={newSection.data.content}
                          onChange={(e) => setNewSection(prev => ({
                            ...prev,
                            data: { ...prev.data, content: e.target.value }
                          }))}
                        />
                      </Form.Group>

                      <Button variant="primary" size="sm" onClick={addSection}>
                        <IconifyIcon icon="bx:plus" className="me-1" />
                        Add Section
                      </Button>
                    </CardBody>
                  </Card>
                </Tab.Pane>

                <Tab.Pane eventKey="preview">
                  <div className="preview-container">
                    <div className="text-center mb-4 pb-4 border-bottom">
                      <h2 className="fw-bold">{formData.title}</h2>
                      {formData.description && (
                        <p className="text-muted lead">{formData.description}</p>
                      )}
                    </div>

                    {formData.sections.length > 0 ? (
                      formData.sections.map((section, index) => (
                        <div key={index} className="mb-4">
                          {section.data.heading && (
                            <h4 className="fw-semibold mb-3">{section.data.heading}</h4>
                          )}
                          {section.data.content && (
                            <p className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                              {section.data.content}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-5">
                        <IconifyIcon icon="bx:file" className="fs-48 text-muted mb-3" />
                        <p className="text-muted">No sections yet</p>
                      </div>
                    )}
                  </div>
                </Tab.Pane>
              </Tab.Content>
            </CardBody>
          </Card>
        </Tab.Container>

        <Card>
          <CardBody>
            <div className="d-flex justify-content-between">
              <small className="text-muted">
                {pageData ? 'Last updated: ' + new Date(pageData.updatedAt).toLocaleString() : 'New page'}
              </small>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" onClick={fetchPrivacyPolicy} disabled={saving}>
                  <IconifyIcon icon="bx:reset" className="me-1" />
                  Reset
                </Button>

                {formData.status === 'draft' && (
                  <Button variant="success" onClick={handlePublish} disabled={saving}>
                    <IconifyIcon icon="bx:check-circle" className="me-1" />
                    Save & Publish
                  </Button>
                )}

                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <IconifyIcon icon="bx:save" className="me-1" />
                      {pageData ? 'Update' : 'Create'} Privacy Policy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </Form>
    </>
  )
}

export default PrivacyPolicyForm
