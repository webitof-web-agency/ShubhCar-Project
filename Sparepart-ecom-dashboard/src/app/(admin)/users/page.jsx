'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL } from '@/helpers/apiBase'
import { useSearchParams } from 'next/navigation'
import {
  Card,
  CardBody,
  Col,
  Row,
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Badge
} from 'react-bootstrap'
import PageTItle from '@/components/PageTItle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'
import { rolesAPI } from '@/helpers/rolesApi'
import { usePermissions } from '@/hooks/usePermissions'


const UsersPage = () => {
  const { data: session, status } = useSession()
  const { hasPermission } = usePermissions()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    status: 'active'
  })

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const canCreateUsers = hasPermission('users.create')
  const canUpdateUsers = hasPermission('users.update')
  const canDeleteUsers = hasPermission('users.delete')

  const fetchUsers = async (page = 1) => {
    if (status !== 'authenticated') return

    const token = session?.accessToken
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/users/admin?role=admin&page=${page}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) throw new Error('Failed to fetch users')

      const data = await response.json()
      setUsers(data.data || [])
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(currentPage)
  }, [currentPage, status])

  const fetchRoles = async () => {
    if (status !== 'authenticated') return
    const token = session?.accessToken
    if (!token) return
    try {
      const response = await rolesAPI.list(token)
      setRoles(response.data || [])
    } catch (err) {
      console.error('Failed to fetch roles', err)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [status])

  // Open modal via query param (?open=create or ?open=edit&id=...)
  useEffect(() => {
    const open = searchParams.get('open')
    const id = searchParams.get('id')
    if (open === 'create' && canCreateUsers) {
      handleOpenCreateModal()
    } else if (open === 'edit' && id && canUpdateUsers) {
      const target = users.find((u) => u._id === id)
      if (target) {
        handleOpenEditModal(target)
      }
    }
  }, [searchParams, users, canCreateUsers, canUpdateUsers])

  const handleOpenCreateModal = () => {
    if (!canCreateUsers) return
    setEditMode(false)
    setEditingUserId(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      roleId: '',
      status: 'active'
    })
    setModalError(null)
    setShowModal(true)
  }

  const handleOpenEditModal = (user) => {
    if (!canUpdateUsers) return
    setEditMode(true)
    setEditingUserId(user._id)
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      roleId: user.roleId || '',
      status: user.status || 'active'
    })
    setModalError(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setModalError(null)
    setEditMode(false)
    setEditingUserId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const token = session?.accessToken
    if (!token) return

    try {
      setSubmitting(true)
      setModalError(null)

      const payload = editMode ? {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        roleId: formData.roleId || undefined,
        status: formData.status
      }
        : {
          ...formData,
          roleId: formData.roleId || undefined
        }

      // Remove password if edit mode and password is empty
      if (editMode && !payload.password) {
        delete payload.password
      }

      const url = editMode
        ? `${API_BASE_URL}/users/admin/${editingUserId}`
        : `${API_BASE_URL}/users/admin`

      const method = editMode ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to ${editMode ? 'update' : 'create'} user`)
      }

      setSuccessMessage(`User ${editMode ? 'updated' : 'created'} successfully!`)
      handleCloseModal()
      fetchUsers(currentPage)

      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setModalError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (user) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    const token = session?.accessToken
    if (!token) return

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/users/admin/${userToDelete._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete user')
      }

      setSuccessMessage('User deleted successfully!')
      setShowDeleteModal(false)
      setUserToDelete(null)
      fetchUsers(currentPage)

      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || (loading && !users.length)) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Alert variant="warning">Please log in to view users.</Alert>
  }

  if (!hasPermission('users.view')) {
    return <Alert variant="warning">You do not have permission to view users.</Alert>
  }

  return (
    <>
      <PageTItle title="USERS LIST" />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <Row>
        <Col xl={12}>
          <Card>
            <div className="d-flex card-header justify-content-between align-items-center">
              <div>
                <h4 className="card-title mb-0">Admin Users</h4>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={handleOpenCreateModal}
                className="d-flex align-items-center gap-1"
                disabled={!canCreateUsers}
              >
                <IconifyIcon icon="bx:plus" />
                Add New
              </Button>
            </div>
            <CardBody>
              <div className="table-responsive">
                <Table className="table align-middle mb-0 table-hover table-centered">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th style={{ width: 20 }}>
                        <Form.Check />
                      </th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Auth Provider</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td>
                          <Form.Check />
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar-sm bg-primary-subtle rounded-circle flex-centered me-2">
                              <span className="text-primary fw-bold">
                                {user.firstName?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="fw-medium">{user.firstName} {user.lastName}</div>
                            </div>
                          </div>
                        </td>
                        <td>{user.email || '-'}</td>
                        <td>{user.phone || '-'}</td>
                        <td>
                          {roles.find((role) => role._id === user.roleId)?.name || 'Admin'}
                        </td>
                        <td>
                          <Badge
                            bg={
                              user.status === 'active'
                                ? 'success'
                                : user.status === 'inactive'
                                  ? 'warning'
                                  : 'danger'
                            }
                            className="badge-subtle"
                          >
                            {user.status}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="info" className="badge-subtle text-capitalize">
                            {user.authProvider}
                          </Badge>
                        </td>
                        <td>
                          {new Date(user.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="soft-primary"
                              size="sm"
                              onClick={() => handleOpenEditModal(user)}
                              disabled={!canUpdateUsers}
                            >
                              <IconifyIcon
                                icon="solar:pen-2-broken"
                                className="align-middle fs-18"
                              />
                            </Button>
                            <Button
                              variant="soft-danger"
                              size="sm"
                              onClick={() => handleDeleteClick(user)}
                              disabled={!canDeleteUsers}
                            >
                              <IconifyIcon
                                icon="solar:trash-bin-minimalistic-2-broken"
                                className="align-middle fs-18"
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {loading && users.length === 0 && (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" />
                  </div>
                )}

                {!loading && users.length === 0 && (
                  <div className="text-center py-4 text-muted">
                    No admin users found
                  </div>
                )}
              </div>
            </CardBody>
            <div className="card-footer border-top">
              <nav aria-label="Page navigation">
                <ul className="pagination justify-content-end mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  <li className="page-item active">
                    <span className="page-link">{currentPage}</span>
                  </li>
                  <li className="page-item">
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={users.length < 20}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Create/Edit Admin User Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Edit Admin User' : 'Add New Admin User'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {modalError && (
              <Alert variant="danger" className="mb-3">
                {modalError}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>First Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password {editMode ? '(leave blank to keep current)' : '*'}</Form.Label>
              <Form.Control
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required={!editMode}
                minLength={6}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>User Role</Form.Label>
              <Form.Select
                value={formData.roleId}
                onChange={(e) =>
                  setFormData({ ...formData, roleId: e.target.value })
                }
              >
                <option value="">Admin (Full Access)</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update User' : 'Create User')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {userToDelete && (
            <div>
              <p className="mb-3">Are you sure you want to delete this admin user?</p>
              <div className="bg-light p-3 rounded">
                <p className="mb-1"><strong>Name:</strong> {userToDelete.firstName} {userToDelete.lastName}</p>
                <p className="mb-1"><strong>Email:</strong> {userToDelete.email || '-'}</p>
                <p className="mb-1">
                  <strong>Role:</strong> {roles.find((role) => role._id === userToDelete.roleId)?.name || 'Admin'}
                </p>
                <p className="mb-0"><strong>Status:</strong> {userToDelete.status}</p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm} disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default UsersPage
