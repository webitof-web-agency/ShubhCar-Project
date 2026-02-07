'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL } from '@/helpers/apiBase'
import { useRouter } from 'next/navigation'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import {
  Card,
  CardFooter,
  Col,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Row,
  Table,
  Badge,
  Spinner,
  Alert,
  Button,
  Modal,
  Form,
  Placeholder
} from 'react-bootstrap'
import FormErrorModal from '@/components/forms/FormErrorModal'
import DataTable from '@/components/shared/DataTable'
import StatusToggle from '@/components/shared/StatusToggle'


const CustomerDataList = ({ defaultFilter = 'all' }) => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [customerTypeFilter, setCustomerTypeFilter] = useState(defaultFilter)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
    customerType: 'retail',
    status: 'active'
  })

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importSummary, setImportSummary] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const [approvingId, setApprovingId] = useState(null)
  const [togglingStatusId, setTogglingStatusId] = useState(null)
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState({})
  const [touchedFields, setTouchedFields] = useState({})
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState([])

  // Select all handler
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(customers.map(c => c._id))
    } else {
      setSelectedCustomers([])
    }
  }

  // Select individual customer
  const handleSelectOne = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId)
      } else {
        return [...prev, customerId]
      }
    })
  }

  const fetchCustomers = async (page = 1, filter = 'all') => {
    if (status !== 'authenticated') return

    const token = session?.accessToken
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let url = `${API_BASE_URL}/users/admin?role=customer&page=${page}&limit=20`

      if (filter !== 'all') {
        url += `&customerType=${filter}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to fetch customers')

      const data = await response.json()
      setCustomers(data.data || [])
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers(currentPage, customerTypeFilter)
  }, [currentPage, customerTypeFilter, status])

  const handleFilterChange = (filter) => {
    setCustomerTypeFilter(filter)
    setCurrentPage(1)
  }

  const buildExportUrl = (format) => {
    const params = new URLSearchParams()
    params.set('format', format)
    params.set('role', 'customer')
    if (customerTypeFilter !== 'all') {
      params.set('customerType', customerTypeFilter)
    }
    return `${API_BASE_URL}/users/admin/customers/export?${params.toString()}`
  }

  const handleExport = async (format) => {
    const token = session?.accessToken
    if (!token || exporting) return

    try {
      setExporting(true)
      const response = await fetch(buildExportUrl(format), {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      })
      if (!response.ok) {
        throw new Error('Failed to export customers')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') || ''
      const fileNameMatch = disposition.match(/filename="(.+)"/)
      const fileName = fileNameMatch?.[1] || `customers-export.${format}`
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      setError(err.message || 'Failed to export customers')
    } finally {
      setExporting(false)
    }
  }

  const handleOpenImportModal = () => {
    setImportFile(null)
    setImportError(null)
    setImportSummary(null)
    setImportErrors([])
    setShowImportModal(true)
  }

  const handleImport = async (e) => {
    e.preventDefault()
    const token = session?.accessToken
    if (!token || importing) return

    if (!importFile) {
      setImportError('Please select a CSV or XLSX file')
      return
    }

    const name = importFile.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      setImportError('Only CSV or XLSX files are allowed')
      return
    }
    if (importFile.size > 5 * 1024 * 1024) {
      setImportError('File size must be 5MB or less')
      return
    }

    try {
      setImporting(true)
      setImportError(null)
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch(`${API_BASE_URL}/users/admin/customers/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Failed to import customers')
      }

      const payload = data?.data || {}
      setImportSummary({
        created: payload.created || 0,
        updated: payload.updated || 0,
        failed: payload.failed || 0
      })
      setImportErrors(payload.errors || [])
      fetchCustomers(currentPage, customerTypeFilter)
    } catch (err) {
      setImportError(err.message || 'Failed to import customers')
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadImportErrors = () => {
    if (!importErrors.length) return
    const headers = ['Row', 'Error']
    const lines = [headers.join(',')]
    importErrors.forEach((entry) => {
      const row = String(entry.row || '')
      const message = String(entry.message || '').replace(/"/g, '""')
      lines.push(`${row},"${message}"`)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = 'customer-import-errors.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const handleOpenCreateModal = () => {
    setEditMode(false)
    setEditingCustomerId(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      role: 'customer',
      customerType: 'retail',
      status: 'active'
    })
    setModalError(null)
    setValidationErrors({})
    setTouchedFields({})
    setShowModal(true)
  }

  const handleOpenEditModal = (customer) => {
    setEditMode(true)
    setEditingCustomerId(customer._id)
    setFormData({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      password: '',
      customerType: customer.customerType || 'retail',
      status: customer.status || 'active'
    })
    setModalError(null)
    setValidationErrors({})
    setTouchedFields({})
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setModalError(null)
    setValidationErrors({})
    setTouchedFields({})
    setEditMode(false)
    setEditingCustomerId(null)
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.firstName?.trim()) {
      errors.firstName = 'First Name is required'
    }
    
    if (!formData.email?.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Please enter a valid 10-digit phone number'
    }
    
    if (!editMode && !formData.password) {
      errors.password = 'Password is required'
    }
    
    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate form
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setShowErrorModal(true)
      return
    }

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
        customerType: formData.customerType,
        status: formData.status
      }
        : {
          ...formData,
          role: 'customer'
        }

      // Remove password if edit mode and password is empty
      if (editMode && !payload.password) {
        delete payload.password
      }

      //check
      if (editMode && 'role' in payload) {
        console.error('BUG: role leaked into customer edit payload', payload)
      }

      const url = editMode
        ? `${API_BASE_URL}/users/admin/${editingCustomerId}`
        : `${API_BASE_URL}/users/register`

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
        throw new Error(errorData.message || `Failed to ${editMode ? 'update' : 'create'} customer`)
      }

      setSuccessMessage(`Customer ${editMode ? 'updated' : 'created'} successfully!`)
      handleCloseModal()
      fetchCustomers(currentPage, customerTypeFilter)

      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setModalError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return

    const token = session?.accessToken
    if (!token) return

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/users/admin/${customerToDelete._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete customer')
      }

      setSuccessMessage('Customer deleted successfully!')
      setShowDeleteModal(false)
      setCustomerToDelete(null)
      fetchCustomers(currentPage, customerTypeFilter)

      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveWholesale = async (customer) => {
    const token = session?.accessToken
    if (!token || !customer?._id) return

    const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'this customer'
    const confirmed = window.confirm(`Approve wholesale customer ${name}?`)
    if (!confirmed) return

    try {
      setApprovingId(customer._id)
      const response = await fetch(`${API_BASE_URL}/users/admin/${customer._id}/approve-wholesale`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to approve wholesale customer')
      }

      const data = await response.json()
      const updated = data?.data || {}

      setCustomers(prev => prev.map((item) => (
        item._id === customer._id
          ? {
            ...item,
            verificationStatus: updated.verificationStatus || 'approved',
            verifiedAt: updated.verifiedAt || item.verifiedAt
          }
          : item
      )))
      setSuccessMessage('Wholesale customer approved successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to approve wholesale customer')
    } finally {
      setApprovingId(null)
    }
  }

  const handleToggleStatus = async (customer) => {
    const token = session?.accessToken
    if (!token || !customer?._id) return

    try {
      setTogglingStatusId(customer._id)
      const newStatus = customer.status === 'active' ? 'inactive' : 'active'

      const response = await fetch(`${API_BASE_URL}/users/admin/${customer._id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to update customer status')
      }

      // Update local state
      setCustomers(prev => prev.map(item => 
        item._id === customer._id ? { ...item, status: newStatus } : item
      ))
      setSuccessMessage(`Customer status updated to ${newStatus}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to update customer status')
    } finally {
      setTogglingStatusId(null)
    }
  }

  const showSkeleton = status === 'loading' || (loading && !customers.length)

  const renderRowSkeletons = (count = 8) =>
    Array.from({ length: count }).map((_, idx) => (
      <tr key={`customer-skeleton-${idx}`} className="placeholder-glow">
        <td>
          <Placeholder xs={1} />
        </td>
        <td>
          <div className="d-flex align-items-center">
            <div className="avatar-sm bg-primary-subtle rounded-circle flex-centered me-2">
              <Placeholder style={{ width: 28, height: 28, borderRadius: '50%' }} />
            </div>
            <div className="flex-grow-1">
              <Placeholder xs={6} />
            </div>
          </div>
        </td>
        <td><Placeholder xs={6} /></td>
        <td><Placeholder xs={5} /></td>
        <td className="text-center"><Placeholder xs={4} /></td>
        <td className="text-center"><Placeholder xs={4} /></td>
        <td className="text-center"><Placeholder xs={4} /></td>
        <td><Placeholder xs={4} /></td>
        <td><Placeholder xs={3} /></td>
      </tr>
    ))

  if (showSkeleton) {
    return (
      <Row>
        <Col xl={12}>
          <Card>
            <div className="d-flex card-header justify-content-between align-items-center">
              <div className="placeholder-glow w-50">
                <Placeholder xs={4} />
              </div>
              <div className="d-flex gap-2">
                <Placeholder.Button xs={3} size="sm" />
                <Placeholder.Button xs={3} size="sm" />
              </div>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover table-centered">
                <thead className="bg-light-subtle">
                  <tr>
                    <th style={{ width: 20 }} />
                    <th>Customer Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="text-center">Customer Type</th>
                    <th className="text-center">Verification</th>
                    <th className="text-center">Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {renderRowSkeletons()}
                </tbody>
              </table>
            </div>
          </Card>
        </Col>
      </Row>
    )
  }

  if (status === 'unauthenticated') {
    return <Alert variant="warning">Please log in to view customers.</Alert>
  }

  return (
    <>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage('')} className="mb-3">
          {successMessage}
        </Alert>
      )}

      <Row>
        <Col xl={12}>
          <Card>
            <div className="d-flex card-header justify-content-between align-items-center">
              <div>
                <h4 className="card-title mb-0">All Customers List</h4>
              </div>
              <div className="d-flex gap-2">
                <Dropdown>
                  <DropdownToggle
                    variant="outline-light"
                    size="sm"
                    className="content-none icons-center"
                  >
                    Filter: {customerTypeFilter === 'all' ? 'All' : customerTypeFilter.charAt(0).toUpperCase() + customerTypeFilter.slice(1)}{' '}
                    <IconifyIcon className="ms-1" width={16} height={16} icon="bx:chevron-down" />
                  </DropdownToggle>
                  <DropdownMenu className="dropdown-menu-end">
                    <DropdownItem
                      onClick={() => handleFilterChange('all')}
                      active={customerTypeFilter === 'all'}
                    >
                      All
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => handleFilterChange('retail')}
                      active={customerTypeFilter === 'retail'}
                    >
                      Retail
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => handleFilterChange('wholesale')}
                      active={customerTypeFilter === 'wholesale'}
                    >
                      Wholesale
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>

                <Dropdown>
                  <DropdownToggle
                    variant="outline-light"
                    size="sm"
                    className="content-none icons-center"
                    disabled={exporting}
                  >
                    {exporting ? 'Exporting...' : 'Export'}
                    <IconifyIcon className="ms-1" width={16} height={16} icon="bx:download" />
                  </DropdownToggle>
                  <DropdownMenu className="dropdown-menu-end">
                    <DropdownItem onClick={() => handleExport('csv')}>Export CSV</DropdownItem>
                    <DropdownItem onClick={() => handleExport('xlsx')}>Export Excel</DropdownItem>
                  </DropdownMenu>
                </Dropdown>

                <Button
                  size="sm"
                  variant="outline-light"
                  onClick={handleOpenImportModal}
                  disabled={importing}
                  className="d-flex align-items-center gap-1"
                >
                  <IconifyIcon icon="bx:upload" />
                  Import
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleOpenCreateModal}
                  className="d-flex align-items-center gap-1"
                >
                  <IconifyIcon icon="bx:plus" />
                  Add New
                </Button>

              </div>
            </div>
            <div>
              <div className="table-responsive">
                <table className="table align-middle mb-0 table-hover table-centered">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th style={{ width: 20 }}>
                        <div className="form-check">
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            id="customCheckAll"
                            checked={customers.length > 0 && selectedCustomers.length === customers.length}
                            onChange={handleSelectAll}
                          />
                          <label className="form-check-label" htmlFor="customCheckAll" />
                        </div>
                      </th>
                      <th>Customer Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th className="text-center">Customer Type</th>
                      <th className="text-center">Verification</th>
                      <th className="text-center">Status</th>
                      <th className="text-center">Active</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer._id}>
                        <td>
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={`check-${customer._id}`}
                              checked={selectedCustomers.includes(customer._id)}
                              onChange={() => handleSelectOne(customer._id)}
                            />
                            <label className="form-check-label" htmlFor={`check-${customer._id}`}>
                              &nbsp;
                            </label>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar-sm bg-primary-subtle rounded-circle flex-centered me-2">
                              <span className="text-primary fw-bold">
                                {customer.firstName?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="fw-medium">{customer.firstName} {customer.lastName}</div>
                            </div>
                          </div>
                        </td>
                        <td>{customer.email || '-'}</td>
                        <td>{customer.phone || '-'}</td>
                        <td className="text-center">
                          <Badge
                            bg={customer.customerType === 'wholesale' ? 'info' : 'primary'}
                            className="badge-subtle text-capitalize"
                          >
                            {customer.customerType}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Badge
                            bg={
                              customer.verificationStatus === 'approved'
                                ? 'success'
                                : customer.verificationStatus === 'pending'
                                  ? 'warning'
                                  : customer.verificationStatus === 'rejected'
                                    ? 'danger'
                                    : 'secondary'
                            }
                            className="badge-subtle text-capitalize"
                          >
                            {customer.verificationStatus === 'not_required' ? 'Not Required' : customer.verificationStatus || 'Not Required'}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Badge
                            bg={
                              customer.status === 'active'
                                ? 'success'
                                : customer.status === 'inactive'
                                  ? 'warning'
                                  : 'danger'
                            }
                            className="badge-subtle"
                          >
                            {customer.status === 'active' ? 'Active' : customer.status === 'inactive' ? 'Inactive' : 'Unknown'}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <StatusToggle
                            checked={customer.status === 'active'}
                            onChange={() => handleToggleStatus(customer)}
                            loading={togglingStatusId === customer._id}
                            label={customer.status === 'active' ? 'Active' : 'Inactive'}
                          />
                        </td>
                        <td>
                          {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="btn btn-light"
                              size="sm"
                              onClick={() => router.push('/customer/customer-detail?id=' + customer._id)}
                            >
                              <IconifyIcon icon="solar:eye-broken" className="align-middle fs-18" />
                            </Button>
                            <Button
                              variant="soft-primary"
                              size="sm"
                              onClick={() => handleOpenEditModal(customer)}
                            >
                              <IconifyIcon icon="solar:pen-2-broken" className="align-middle fs-18" />
                            </Button>
                            {customer.customerType === 'wholesale' && customer.verificationStatus === 'pending' && (
                              <Button
                                variant="soft-success"
                                size="sm"
                                onClick={() => handleApproveWholesale(customer)}
                                disabled={approvingId === customer._id}
                                title="Approve wholesale customer"
                              >
                                {approvingId === customer._id ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  <IconifyIcon icon="solar:check-circle-broken" className="align-middle fs-18" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="soft-danger"
                              size="sm"
                              onClick={() => handleDeleteClick(customer)}
                            >
                              <IconifyIcon icon="solar:trash-bin-minimalistic-2-broken" className="align-middle fs-18" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {loading && (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" />
                  </div>
                )}

                {!loading && customers.length === 0 && (
                  <div className="text-center py-4 text-muted">
                    No customers found
                  </div>
                )}
              </div>
            </div>
            <CardFooter className="border-top">
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
                      disabled={customers.length < 20}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </CardFooter>
          </Card>
        </Col>
      </Row>

      {/* Create/Edit Customer Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Edit Customer' : 'Add New Customer'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {modalError && (
              <Alert variant="danger" className="mb-3">
                {modalError}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>
                First Name
                <span className="text-danger ms-1">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                value={formData.firstName}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, firstName: value })
                  setTouchedFields({ ...touchedFields, firstName: true })
                }}
                isInvalid={touchedFields.firstName && !formData.firstName?.trim()}
                required
              />
              {touchedFields.firstName && !formData.firstName?.trim() && (
                <Form.Control.Feedback type="invalid">
                  First Name is required
                </Form.Control.Feedback>
              )}
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
              <Form.Label>
                Email
                <span className="text-danger ms-1">*</span>
              </Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, email: value })
                  setTouchedFields({ ...touchedFields, email: true })
                }}
                isInvalid={touchedFields.email && validationErrors.email}
                required
              />
              {touchedFields.email && validationErrors.email && (
                <Form.Control.Feedback type="invalid">
                  {validationErrors.email}
                </Form.Control.Feedback>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setFormData({ ...formData, phone: value })
                  setTouchedFields({ ...touchedFields, phone: true })
                }}
                placeholder="10-digit mobile number"
                maxLength={10}
                isInvalid={touchedFields.phone && validationErrors.phone}
              />
              {touchedFields.phone && validationErrors.phone && (
                <Form.Control.Feedback type="invalid">
                  {validationErrors.phone}
                </Form.Control.Feedback>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                Password {editMode ? '(leave blank to keep current)' : ''}
                {!editMode && <span className="text-danger ms-1">*</span>}
              </Form.Label>
              <Form.Control
                type="password"
                value={formData.password}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, password: value })
                  setTouchedFields({ ...touchedFields, password: true })
                }}
                required={!editMode}
                minLength={6}
                isInvalid={touchedFields.password && validationErrors.password}
              />
              {touchedFields.password && validationErrors.password && (
                <Form.Control.Feedback type="invalid">
                  {validationErrors.password}
                </Form.Control.Feedback>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Customer Type *</Form.Label>
              <Form.Select
                value={formData.customerType}
                onChange={(e) =>
                  setFormData({ ...formData, customerType: e.target.value })
                }
                required
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </Form.Select>
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
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Customer' : 'Create Customer')}
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
          {customerToDelete && (
            <div>
              <p className="mb-3">Are you sure you want to delete this customer?</p>
              <div className="bg-light p-3 rounded">
                <p className="mb-1"><strong>Name:</strong> {customerToDelete.firstName} {customerToDelete.lastName}</p>
                <p className="mb-1"><strong>Email:</strong> {customerToDelete.email || '-'}</p>
                <p className="mb-1"><strong>Customer Type:</strong> {customerToDelete.customerType}</p>
                <p className="mb-0"><strong>Status:</strong> {customerToDelete.status}</p>
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

      {/* Import Customers Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Import Customers</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleImport}>
          <Modal.Body>
            {importError && (
              <Alert variant="danger" className="mb-3">
                {importError}
              </Alert>
            )}
            {importSummary && (
              <Alert variant="success" className="mb-3">
                Imported: {importSummary.created} created, {importSummary.updated} updated, {importSummary.failed} failed.
              </Alert>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Upload CSV or XLSX</Form.Label>
              <Form.Control
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <Form.Text className="text-muted">
                Required columns: name, email, customer_type, status, verification_status (phone optional).
              </Form.Text>
            </Form.Group>
            {importErrors.length > 0 && (
              <div className="d-flex align-items-center justify-content-between bg-light p-2 rounded">
                <span className="text-muted small">{importErrors.length} rows failed.</span>
                <Button size="sm" variant="outline-danger" onClick={handleDownloadImportErrors}>
                  Download Errors
                </Button>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowImportModal(false)} disabled={importing}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={importing}>
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Form Validation Errors Modal */}
      <FormErrorModal
        show={showErrorModal}
        errors={validationErrors}
        onClose={() => setShowErrorModal(false)}
      />
    </>
  )
}

export default CustomerDataList
