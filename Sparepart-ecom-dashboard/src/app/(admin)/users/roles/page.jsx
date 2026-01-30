'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
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
import { rolesAPI } from '@/helpers/rolesApi'
import { PERMISSION_ACTIONS, PERMISSION_MATRIX } from '@/constants/permissions'
import { toast } from 'react-toastify'
import { usePermissions } from '@/hooks/usePermissions'

const RolesPage = () => {
  const { data: session, status } = useSession()
  const { hasPermission } = usePermissions()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editRoleId, setEditRoleId] = useState(null)
  const [formData, setFormData] = useState({ name: '', permissions: [] })
  const [originalPermissions, setOriginalPermissions] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const canViewRoles = hasPermission('roles.view')
  const canCreateRoles = hasPermission('roles.create')
  const canUpdateRoles = hasPermission('roles.update')
  const canDeleteRoles = hasPermission('roles.delete')

  const permissionKeys = useMemo(() => {
    const keys = []
    PERMISSION_MATRIX.forEach((row) => {
      row.actions.forEach((action) => {
        keys.push(`${row.resource}.${action}`)
      })
    })
    return keys
  }, [])

  const extraPermissions = useMemo(() => {
    const known = new Set(permissionKeys)
    return originalPermissions.filter((perm) => !known.has(perm))
  }, [originalPermissions, permissionKeys])

  const fetchRoles = async () => {
    if (status !== 'authenticated') return
    const token = session?.accessToken
    if (!token) return
    try {
      setLoading(true)
      const response = await rolesAPI.list(token)
      setRoles(response.data || [])
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [status])

  const handleOpenCreate = () => {
    setEditRoleId(null)
    setFormData({ name: '', permissions: [] })
    setOriginalPermissions([])
    setShowModal(true)
  }

  const handleOpenEdit = (role) => {
    setEditRoleId(role._id)
    const perms = Array.isArray(role.permissions) ? role.permissions : []
    setFormData({
      name: role.name || '',
      permissions: perms,
    })
    setOriginalPermissions(perms)
    setShowModal(true)
  }

  const handleClose = () => {
    setShowModal(false)
    setEditRoleId(null)
  }

  const handleTogglePermission = (key) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(key)
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((item) => item !== key)
          : [...prev.permissions, key],
      }
    })
  }

  const handleSave = async () => {
    if (!session?.accessToken) return
    if (!formData.name.trim()) {
      toast.error('Role name is required')
      return
    }
    try {
      setSubmitting(true)
      const payload = {
        ...formData,
        permissions: [...new Set([...formData.permissions, ...extraPermissions])],
      }
      if (editRoleId) {
        await rolesAPI.update(editRoleId, payload, session.accessToken)
        toast.success('Role updated')
      } else {
        await rolesAPI.create(payload, session.accessToken)
        toast.success('Role created')
      }
      handleClose()
      fetchRoles()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to save role')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (role) => {
    if (role.isSystem) return
    if (!confirm(`Delete role "${role.name}"?`)) return
    try {
      await rolesAPI.remove(role._id, session.accessToken)
      toast.success('Role deleted')
      fetchRoles()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to delete role')
    }
  }

  if (!canViewRoles) {
    return (
      <>
        <PageTItle title="USER ROLES" />
        <Alert variant="warning">You do not have permission to view roles.</Alert>
      </>
    )
  }

  return (
    <>
      <PageTItle title="USER ROLES" />
      <Row>
        <Col lg={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <CardTitle as="h4">Roles</CardTitle>
              <Button size="sm" variant="primary" onClick={handleOpenCreate} disabled={!canCreateRoles}>
                Create Role
              </Button>
            </CardHeader>
            <CardBody>
              {error && <Alert variant="danger">{error}</Alert>}
              {loading ? (
                <div className="text-center py-4"><Spinner animation="border" /></div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Permissions</th>
                        <th>Status</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((role) => (
                        <tr key={role._id}>
                          <td>{role.name}</td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {(role.permissions || []).slice(0, 4).map((perm) => (
                                <Badge key={perm} bg="light" text="dark">{perm}</Badge>
                              ))}
                              {(role.permissions || []).length > 4 && (
                                <Badge bg="secondary">+{(role.permissions || []).length - 4}</Badge>
                              )}
                            </div>
                          </td>
                          <td>{role.isSystem ? 'Default' : 'Custom'}</td>
                          <td className="text-end">
                            <div className="d-flex gap-2 justify-content-end">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleOpenEdit(role)}
                                disabled={role.isSystem || !canUpdateRoles}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(role)}
                                disabled={role.isSystem || !canDeleteRoles}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!roles.length && (
                        <tr><td colSpan={4} className="text-center text-muted">No roles found</td></tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={handleClose} size="lg" scrollable centered>
        <Modal.Header className="d-flex align-items-center" closeButton>
          <Modal.Title>{editRoleId ? 'Edit Role' : 'Create Role'}</Modal.Title>
          <div className="ms-3 d-flex">
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              disabled={submitting || (!editRoleId && !canCreateRoles) || (editRoleId && !canUpdateRoles)}
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Role Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Role name"
              />
            </Form.Group>

            <div className="mb-3">
              <Form.Label>Permissions</Form.Label>
              <div className="border rounded p-3">
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Page</th>
                        {PERMISSION_ACTIONS.map((action) => (
                          <th key={action} className="text-center text-uppercase">
                            {action === 'create'
                              ? 'Create/Add'
                              : action === 'update'
                                ? 'Edit/Update'
                                : action}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_MATRIX.map((row, index) => (
                        <tr key={row.resource}>
                          <td>
                            <Form.Check
                              checked={row.actions.every((action) =>
                                formData.permissions.includes(`${row.resource}.${action}`),
                              )}
                              onChange={() => {
                                const allSelected = row.actions.every((action) =>
                                  formData.permissions.includes(`${row.resource}.${action}`),
                                )
                                const nextPermissions = row.actions.map(
                                  (action) => `${row.resource}.${action}`,
                                )
                                setFormData((prev) => ({
                                  ...prev,
                                  permissions: allSelected
                                    ? prev.permissions.filter((perm) => !nextPermissions.includes(perm))
                                    : Array.from(new Set([...prev.permissions, ...nextPermissions])),
                                }))
                              }}
                            />
                          </td>
                          <td>{row.label}</td>
                          {PERMISSION_ACTIONS.map((action) => {
                            const key = `${row.resource}.${action}`
                            const isAllowed = row.actions.includes(action)
                            return (
                              <td key={key} className="text-center">
                                <Form.Check
                                  type="checkbox"
                                  disabled={!isAllowed}
                                  checked={isAllowed && formData.permissions.includes(key)}
                                  onChange={() => handleTogglePermission(key)}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  )
}

export default RolesPage
