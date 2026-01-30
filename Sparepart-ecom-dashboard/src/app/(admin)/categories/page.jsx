'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL } from '@/helpers/apiBase'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Table,
  Row,
  Col,
  Button,
  Spinner,
  Alert,
  Badge,
  Modal,
  Form,
} from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import PageTItle from '@/components/PageTItle'


const flattenCategories = (nodes = []) => {
  const result = []
  const walk = (list, rootName = null) => {
    list.forEach((node) => {
      result.push({
        ...node,
        parentName: rootName,
        parentId: node.parentId || null,
      })
      if (Array.isArray(node.children) && node.children.length) {
        walk(node.children, rootName || node.name)
      }
    })
  }
  walk(nodes, null)
  return result
}

const CategoriesPage = () => {
  const { data: session, status } = useSession()
  const [tree, setTree] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    parentId: '',
    name: '',
    slug: '',
    isActive: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const fetchCategories = async () => {
    if (status !== 'authenticated') return

    const token = session?.accessToken
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/categories/hierarchy`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }

      const data = await response.json()
      const treeData = data.data || []
      setTree(treeData)
      setCategories(flattenCategories(treeData))
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [status])

  const handleOpenModal = () => {
    setEditMode(false)
    setEditingId(null)
    setFormData({ parentId: '', name: '', slug: '', isActive: true })
    setShowModal(true)
    setSuccessMessage(null)
    setError(null)
  }

  const handleOpenEditModal = (cat) => {
    setEditMode(true)
    setEditingId(cat._id)
    setFormData({
      parentId: cat.parentId || '',
      name: cat.name || '',
      slug: cat.slug || '',
      isActive: !!cat.isActive,
    })
    setShowModal(true)
    setSuccessMessage(null)
    setError(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditMode(false)
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = session?.accessToken
    if (!token) return

    if (!formData.name || !formData.slug) {
      setError('Name and slug are required')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        name: formData.name,
        slug: formData.slug,
        parentId: formData.parentId || null,
        isActive: formData.isActive,
      }

      const method = editMode ? 'PUT' : 'POST'
      const url = editMode
        ? `${API_BASE_URL}/categories/admin/${editingId}`
        : `${API_BASE_URL}/categories/admin`

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.message || 'Failed to create category')
      }

      setSuccessMessage(editMode ? 'Category updated successfully!' : 'Category created successfully!')
      setShowModal(false)
      fetchCategories()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (cat) => {
    const token = session?.accessToken
    if (!token) return
    try {
      setTogglingId(cat._id)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/categories/admin/${cat._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !cat.isActive }),
      })
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.message || 'Failed to update category')
      }
      setSuccessMessage('Category status updated')
      fetchCategories()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (cat) => {
    const token = session?.accessToken
    if (!token) return
    if (!confirm(`Delete category "${cat.name}"?`)) return
    try {
      setDeletingId(cat._id)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/categories/admin/${cat._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.message || 'Failed to delete category')
      }
      setSuccessMessage('Category deleted')
      fetchCategories()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const parentOptions = useMemo(() => {
    return [
      { label: 'No parent (Root)', value: '' },
      ...categories.map((cat) => ({
        label: cat.parentName ? `${cat.parentName} / ${cat.name}` : cat.name,
        value: cat._id,
      })),
    ]
  }, [categories])

  if (status === 'loading' || (loading && !categories.length)) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Alert variant="warning">Please log in to manage categories.</Alert>
  }

  return (
    <>
      <PageTItle title="CATEGORY MANAGEMENT" />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Row>
        <Col xl={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <CardTitle as="h4" className="mb-0">
                All Categories
              </CardTitle>
              <Button size="sm" variant="primary" onClick={handleOpenModal} className="d-flex align-items-center gap-1">
                <IconifyIcon icon="bx:plus" />
                Add Category
              </Button>
            </CardHeader>
            <CardBody>
              <div className="table-responsive">
                <Table hover responsive className="align-middle">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th style={{ width: 20 }}>
                        <Form.Check />
                      </th>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Parent</th>
                      <th>Status</th>
                      <th>Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat._id}>
                        <td>
                          <Form.Check />
                        </td>
                        <td className="fw-medium">{cat.name}</td>
                        <td>
                          <code>{cat.slug}</code>
                        </td>
                        <td>{cat.parentName || 'Root'}</td>
                        <td>
                          <Badge bg={cat.isActive ? 'success' : 'secondary'} className="badge-subtle">
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <Form.Check
                            type="switch"
                            id={`cat-toggle-${cat._id}`}
                            label={togglingId === cat._id ? 'Updating...' : cat.isActive ? 'Active' : 'Inactive'}
                            checked={!!cat.isActive}
                            disabled={togglingId === cat._id}
                            onChange={() => handleToggleActive(cat)}
                          />
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="soft-primary"
                              size="sm"
                              onClick={() => handleOpenEditModal(cat)}
                            >
                              <IconifyIcon icon="solar:pen-2-broken" />
                            </Button>
                            <Button
                              variant="soft-danger"
                              size="sm"
                              disabled={deletingId === cat._id}
                              onClick={() => handleDelete(cat)}
                            >
                              {deletingId === cat._id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <IconifyIcon icon="solar:trash-bin-minimalistic-2-broken" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!categories.length && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-4">
                          No categories found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Edit Category' : 'Create Category'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Parent</Form.Label>
              <Form.Select
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              >
                {parentOptions.map((opt) => (
                  <option key={opt.value || 'root'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Leave empty to create a root category. Selecting a parent will create a subcategory.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Slug *</Form.Label>
              <Form.Control
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Check
                type="checkbox"
                label="Active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default CategoriesPage
