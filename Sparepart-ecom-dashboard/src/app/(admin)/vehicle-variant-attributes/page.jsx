'use client'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row, Spinner, Table, Button, Form, Modal } from 'react-bootstrap'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL } from '@/helpers/apiBase'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const VehicleVariantAttributesPage = () => {
  const { data: session } = useSession()
  const [attributes, setAttributes] = useState([])
  const [values, setValues] = useState([])
  const [loading, setLoading] = useState(true)

  const [showAttributeModal, setShowAttributeModal] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState(null)
  const [attributeForm, setAttributeForm] = useState({ name: '', type: 'dropdown', status: 'active' })

  const [showValueModal, setShowValueModal] = useState(false)
  const [editingValue, setEditingValue] = useState(null)
  const [valueForm, setValueForm] = useState({ attributeId: '', value: '', status: 'active' })

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState({ type: '', id: '' })

  const [filterAttributeId, setFilterAttributeId] = useState('')

  const attributeMap = useMemo(() => {
    const map = new Map()
    attributes.forEach((attr) => map.set(attr._id, attr))
    return map
  }, [attributes])

  const filteredValues = useMemo(() => {
    if (!filterAttributeId) return values
    return values.filter((item) => item.attributeId === filterAttributeId)
  }, [values, filterAttributeId])

  const fetchAttributes = async () => {
    const response = await fetch(`${API_BASE_URL}/vehicle-attributes?limit=200`, {
      headers: { Authorization: `Bearer ${session?.accessToken}` },
    })
    if (response.ok) {
      const result = await response.json()
      const data = result.data || result
      setAttributes(data.items || [])
    }
  }

  const fetchValues = async () => {
    const response = await fetch(`${API_BASE_URL}/vehicle-attribute-values?limit=500`, {
      headers: { Authorization: `Bearer ${session?.accessToken}` },
    })
    if (response.ok) {
      const result = await response.json()
      const data = result.data || result
      setValues(data.items || [])
    }
  }

  useEffect(() => {
    if (session?.accessToken) {
      Promise.all([fetchAttributes(), fetchValues()])
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [session])

  const openAttributeModal = (item = null) => {
    if (item) {
      setEditingAttribute(item)
      setAttributeForm({ name: item.name, type: item.type || 'dropdown', status: item.status || 'active' })
    } else {
      setEditingAttribute(null)
      setAttributeForm({ name: '', type: 'dropdown', status: 'active' })
    }
    setShowAttributeModal(true)
  }

  const openValueModal = (item = null) => {
    if (item) {
      setEditingValue(item)
      setValueForm({ attributeId: item.attributeId, value: item.value, status: item.status || 'active' })
    } else {
      setEditingValue(null)
      setValueForm({ attributeId: '', value: '', status: 'active' })
    }
    setShowValueModal(true)
  }

  const saveAttribute = async () => {
    if (!session?.accessToken) return
    if (!attributeForm.name) {
      alert('Please enter attribute name')
      return
    }
    const url = editingAttribute
      ? `${API_BASE_URL}/vehicle-attributes/${editingAttribute._id}`
      : `${API_BASE_URL}/vehicle-attributes`

    const response = await fetch(url, {
      method: editingAttribute ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attributeForm),
    })

    if (response.ok) {
      setShowAttributeModal(false)
      setEditingAttribute(null)
      setAttributeForm({ name: '', type: 'dropdown', status: 'active' })
      fetchAttributes()
    } else {
      const err = await response.json().catch(() => ({}))
      alert(err?.message || 'Failed to save attribute')
    }
  }

  const saveValue = async () => {
    if (!session?.accessToken) return
    if (!valueForm.attributeId || !valueForm.value) {
      alert('Please select an attribute and enter value')
      return
    }
    const url = editingValue
      ? `${API_BASE_URL}/vehicle-attribute-values/${editingValue._id}`
      : `${API_BASE_URL}/vehicle-attribute-values`

    const response = await fetch(url, {
      method: editingValue ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(valueForm),
    })

    if (response.ok) {
      setShowValueModal(false)
      setEditingValue(null)
      setValueForm({ attributeId: '', value: '', status: 'active' })
      fetchValues()
    } else {
      const err = await response.json().catch(() => ({}))
      alert(err?.message || 'Failed to save value')
    }
  }

  const requestDelete = (type, id) => {
    setDeleteTarget({ type, id })
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    const { type, id } = deleteTarget
    if (!id) return

    const url = type === 'attribute'
      ? `${API_BASE_URL}/vehicle-attributes/${id}`
      : `${API_BASE_URL}/vehicle-attribute-values/${id}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.accessToken}` },
    })

    if (response.ok) {
      if (type === 'attribute') {
        fetchAttributes()
      } else {
        fetchValues()
      }
      setShowDeleteModal(false)
      setDeleteTarget({ type: '', id: '' })
    } else {
      const err = await response.json().catch(() => ({}))
      alert(err?.message || 'Failed to delete')
    }
  }

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>

  return (
    <>
      <PageTItle title="VEHICLE VARIANT ATTRIBUTES" />
      <Row>
        <Col xl={6}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Attributes</h5>
                <Button variant="primary" onClick={() => openAttributeModal()}>Add Attribute</Button>
              </div>
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributes.map((item) => (
                      <tr key={item._id}>
                        <td>{item.name}</td>
                        <td className="text-capitalize">{item.type || 'dropdown'}</td>
                        <td>
                          <span className={`badge px-3 py-2 rounded-pill fs-12 fw-medium ${item.status === 'active'
                            ? 'bg-success-subtle text-success'
                            : 'bg-danger-subtle text-danger'
                            }`}>
                            {item.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 text-primary"
                              onClick={() => openAttributeModal(item)}
                              title="Edit"
                            >
                              <IconifyIcon icon="solar:pen-new-square-bold-duotone" width={20} height={20} />
                            </Button>
                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 text-danger"
                              onClick={() => requestDelete('attribute', item._id)}
                              title="Delete"
                            >
                              <IconifyIcon icon="solar:trash-bin-trash-bold" width={20} height={20} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {attributes.length === 0 && <tr><td colSpan="4" className="text-center">No attributes found</td></tr>}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={6}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Attribute Values</h5>
                <Button variant="primary" onClick={() => openValueModal()}>Add Value</Button>
              </div>
              <Form.Group className="mb-3">
                <Form.Label>Filter by Attribute</Form.Label>
                <Form.Select
                  value={filterAttributeId}
                  onChange={e => setFilterAttributeId(e.target.value)}
                >
                  <option value="">All Attributes</option>
                  {attributes.map((attr) => (
                    <option key={attr._id} value={attr._id}>{attr.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Attribute</th>
                      <th>Value</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredValues.map((item) => (
                      <tr key={item._id}>
                        <td>{attributeMap.get(item.attributeId)?.name || 'N/A'}</td>
                        <td>{item.value}</td>
                        <td>
                          <span className={`badge px-3 py-2 rounded-pill fs-12 fw-medium ${item.status === 'active'
                            ? 'bg-success-subtle text-success'
                            : 'bg-danger-subtle text-danger'
                            }`}>
                            {item.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 text-primary"
                              onClick={() => openValueModal(item)}
                              title="Edit"
                            >
                              <IconifyIcon icon="solar:pen-new-square-bold-duotone" width={20} height={20} />
                            </Button>
                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 text-danger"
                              onClick={() => requestDelete('value', item._id)}
                              title="Delete"
                            >
                              <IconifyIcon icon="solar:trash-bin-trash-bold" width={20} height={20} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredValues.length === 0 && <tr><td colSpan="4" className="text-center">No values found</td></tr>}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={showAttributeModal} onHide={() => setShowAttributeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingAttribute ? 'Edit' : 'Add'} Attribute</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Attribute Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Engine Capacity"
                value={attributeForm.name}
                onChange={e => setAttributeForm({ ...attributeForm, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={attributeForm.type}
                onChange={e => setAttributeForm({ ...attributeForm, type: e.target.value })}
              >
                <option value="dropdown">Dropdown</option>
                <option value="text">Text</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={attributeForm.status}
                onChange={e => setAttributeForm({ ...attributeForm, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAttributeModal(false)}>Close</Button>
          <Button variant="primary" onClick={saveAttribute}>Save</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showValueModal} onHide={() => setShowValueModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingValue ? 'Edit' : 'Add'} Attribute Value</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Attribute</Form.Label>
              <Form.Select
                value={valueForm.attributeId}
                onChange={e => setValueForm({ ...valueForm, attributeId: e.target.value })}
              >
                <option value="">Select attribute</option>
                {attributes.map((attr) => (
                  <option key={attr._id} value={attr._id}>{attr.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Value</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Diesel"
                value={valueForm.value}
                onChange={e => setValueForm({ ...valueForm, value: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={valueForm.status}
                onChange={e => setValueForm({ ...valueForm, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowValueModal(false)}>Close</Button>
          <Button variant="primary" onClick={saveValue}>Save</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this item?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default VehicleVariantAttributesPage
