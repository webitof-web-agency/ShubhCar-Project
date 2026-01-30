'use client'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row, Spinner, Table, Button, Form, Modal } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL } from '@/helpers/apiBase'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const VehicleYearsPage = () => {
  const { data: session } = useSession()
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [newItem, setNewItem] = useState({ year: '', status: 'active' })

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchYears = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicle-years?limit=200`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      })
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        setYears(data.items || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.accessToken) {
      fetchYears()
    } else {
      setLoading(false)
    }
  }, [session])

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item)
      setNewItem({ year: String(item.year), status: item.status || 'active' })
    } else {
      setEditingItem(null)
      setNewItem({ year: '', status: 'active' })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!session?.accessToken) return
    if (!newItem.year) {
      alert('Please enter a year')
      return
    }
    try {
      const url = editingItem
        ? `${API_BASE_URL}/vehicle-years/${editingItem._id}`
        : `${API_BASE_URL}/vehicle-years`

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...newItem, year: Number(newItem.year) }),
      })

      if (response.ok) {
        setShowModal(false)
        setEditingItem(null)
        setNewItem({ year: '', status: 'active' })
        fetchYears()
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err?.message || 'Failed to save')
      }
    } catch (error) {
      console.error(error)
      alert('Failed to save')
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
        `${API_BASE_URL}/vehicle-years/${deletingId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      )

      if (response.ok) {
        fetchYears()
        setShowDeleteModal(false)
        setDeletingId(null)
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err?.message || 'Failed to delete')
      }
    } catch (error) {
      console.error(error)
      alert('Failed to delete')
    }
  }

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>

  return (
    <>
      <PageTItle title="VEHICLE MODEL YEARS" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-end mb-3">
                <Button variant="primary" onClick={() => handleOpenModal()}>Add Year</Button>
              </div>
              <div className="table-responsive">
                <Table hover responsive className="table-nowrap mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {years.map((item) => (
                      <tr key={item._id}>
                        <td>{item.year}</td>
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
                    {years.length === 0 && <tr><td colSpan="3" className="text-center">No years found</td></tr>}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingItem ? 'Edit' : 'Add'} Model Year</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Year</Form.Label>
              <Form.Control
                type="number"
                placeholder="e.g., 2022"
                value={newItem.year}
                onChange={e => setNewItem({ ...newItem, year: e.target.value })}
              />
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
          Are you sure you want to delete this model year?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default VehicleYearsPage
