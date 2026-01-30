'use client'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row, Spinner, Table, Button, Form, Modal } from 'react-bootstrap'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL, API_ORIGIN } from '@/helpers/apiBase'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { mediaAPI } from '@/helpers/mediaApi'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import MediaPickerModal from '@/components/media/MediaPickerModal'

const ModelsPage = () => {
  const { data: session } = useSession()
  const [models, setModels] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingModel, setEditingModel] = useState(null)
  const [newItem, setNewItem] = useState({ brandId: '', name: '', image: '', status: 'active' })
  const [uploading, setUploading] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const mediaBaseUrl = API_ORIGIN

  const resolveMediaUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${mediaBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`
  }

  const brandMap = useMemo(() => {
    const map = new Map()
    const list = Array.isArray(brands) ? brands : []
    list.forEach((b) => map.set(b._id, b))
    return map
  }, [brands])

  const fetchBrands = async () => {
    if (!session?.accessToken) return
    const response = await fetch(`${API_BASE_URL}/vehicle-brands?limit=200`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    if (response.ok) {
      const result = await response.json()
      const data = result?.data || result
      const list = data?.items || data?.brands || data || []
      setBrands(Array.isArray(list) ? list : [])
    }
  }

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicle-models?limit=200`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      })
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        setModels(data.items || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.accessToken) {
      fetchBrands()
      fetchModels()
    } else {
      setLoading(false)
    }
  }, [session])

  const handleOpenModal = (model = null) => {
    if (model) {
      setEditingModel(model)
      setNewItem({ brandId: model.brandId, name: model.name, image: model.image || '', status: model.status || 'active' })
    } else {
      setEditingModel(null)
      setNewItem({ brandId: '', name: '', image: '', status: 'active' })
    }
    setShowModal(true)
  }

  const handleImageUpload = async (files) => {
    const file = Array.isArray(files) ? files[files.length - 1] : null
    if (!file || !session?.accessToken) return
    setUploading(true)
    try {
      const uploaded = await mediaAPI.upload([file], 'product', session.accessToken)
      const items = uploaded?.data || []
      const imageUrl = Array.isArray(items) && items.length ? items[0].url : ''
      setNewItem(prev => ({ ...prev, image: imageUrl }))
    } catch (error) {
      console.error(error)
      alert('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!session?.accessToken) return
    if (!newItem.brandId || !newItem.name) {
      alert('Please select a brand and enter model name')
      return
    }
    try {
      const url = editingModel
        ? `${API_BASE_URL}/vehicle-models/${editingModel._id}`
        : `${API_BASE_URL}/vehicle-models`

      const response = await fetch(url, {
        method: editingModel ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      })

      if (response.ok) {
        setShowModal(false)
        setEditingModel(null)
        setNewItem({ brandId: '', name: '', image: '', status: 'active' })
        fetchModels()
      } else {
        alert('Failed to save model')
      }
    } catch (error) {
      console.error(error)
      alert('Failed to save model')
    }
  }

  const handleDelete = (id) => {
    setDeletingId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      const response = await fetch(
        `${API_BASE_URL}/vehicle-models/${deletingId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      )

      if (response.ok) {
        fetchModels()
        setShowDeleteModal(false)
        setDeletingId(null)
      } else {
        alert('Failed to delete')
      }
    } catch (error) {
      console.error(error)
      alert('Failed to delete')
    }
  }

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>

  return (
    <>
      <PageTItle title="VEHICLE MODELS" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-end mb-3">
                <Button variant="primary" onClick={() => handleOpenModal()}>Add Model</Button>
              </div>
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Model</th>
                      <th>Image</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((item) => (
                      <tr key={item._id}>
                        <td>{brandMap.get(item.brandId)?.name || 'N/A'}</td>
                        <td>{item.name}</td>
                        <td>
                          {item.image ? (
                            <img
                              src={resolveMediaUrl(item.image)}
                              alt={item.name}
                              className="rounded border"
                              style={{ width: 40, height: 40, objectFit: 'cover' }}
                            />
                          ) : (
                            <span className="text-muted">No image</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge px-3 py-2 rounded-pill fs-12 fw-medium ${item.status === 'active'
                              ? 'bg-success-subtle text-success'
                              : 'bg-danger-subtle text-danger'
                              }`}
                            style={{
                              backgroundColor: item.status === 'active' ? '#e6fffa' : '#fff5f5',
                              color: item.status === 'active' ? '#00b894' : '#ff7675',
                            }}
                          >
                            {item.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 text-primary"
                              onClick={() => handleOpenModal(item)}
                              title="Edit"
                            >
                              <IconifyIcon icon="solar:pen-new-square-bold-duotone" width={20} height={20} />
                            </Button>
                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 text-danger"
                              onClick={() => handleDelete(item._id)}
                              title="Delete"
                            >
                              <IconifyIcon icon="solar:trash-bin-trash-bold" width={20} height={20} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {models.length === 0 && <tr><td colSpan="5" className="text-center">No models found</td></tr>}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingModel ? 'Edit' : 'Add'} Vehicle Model</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Brand</Form.Label>
              <Form.Select
                value={newItem.brandId}
                onChange={e => setNewItem({ ...newItem, brandId: e.target.value })}
              >
                <option value="">Select brand</option>
                {brands.map((brand) => (
                  <option key={brand._id} value={brand._id}>
                    {brand.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Model Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Swift, City"
                value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="d-block">Model Image (optional)</Form.Label>
              {newItem.image ? (
                <div className="position-relative d-inline-block">
                  <img
                    src={resolveMediaUrl(newItem.image)}
                    alt="Model"
                    className="rounded border"
                    style={{ width: 140, height: 140, objectFit: 'cover' }}
                  />
                  <Button
                    type="button"
                    variant="light"
                    className="position-absolute top-0 start-100 translate-middle p-0 rounded-circle border"
                    style={{ width: 26, height: 26 }}
                    onClick={() => setNewItem((prev) => ({ ...prev, image: '' }))}
                    title="Remove image"
                  >
                    <IconifyIcon icon="mdi:close" width={16} height={16} />
                  </Button>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  <DropzoneFormInput
                    text="Drag & drop image here, or click to upload"
                    textClassName="fs-6"
                    className="py-4"
                    iconProps={{ icon: 'bx:cloud-upload', width: 28, height: 28 }}
                    showPreview={false}
                    maxFiles={1}
                    onFileUpload={handleImageUpload}
                  />
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setShowMediaPicker(true)}
                    disabled={uploading}
                  >
                    Choose from Media Library
                  </Button>
                </div>
              )}
              {uploading && <div className="text-muted mt-2">Uploading...</div>}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={newItem.status}
                onChange={e => setNewItem({ ...newItem, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this model?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>

      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        multiple={false}
        usedIn="product"
        onSelect={(items) => {
          const selected = items[0]
          if (selected?.url) {
            setNewItem((prev) => ({ ...prev, image: selected.url }))
          }
        }}
      />
    </>
  )
}

export default ModelsPage
