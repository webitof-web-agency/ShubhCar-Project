'use client'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row, Spinner, Table, Button, Form, Modal, Pagination } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL, API_ORIGIN } from '@/helpers/apiBase'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { mediaAPI } from '@/helpers/mediaApi'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import MediaPickerModal from '@/components/media/MediaPickerModal'

const ManufacturerBrandsPage = () => {
    const { data: session } = useSession()
    const [brands, setBrands] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)
    const [total, setTotal] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [editingBrand, setEditingBrand] = useState(null)
    const [newItem, setNewItem] = useState({ name: '', description: '', logo: '', type: 'manufacturer', status: 'active' })
    const [uploading, setUploading] = useState(false)
    const [showMediaPicker, setShowMediaPicker] = useState(false)

    // Delete handling
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    const mediaBaseUrl = API_ORIGIN

    const resolveMediaUrl = (url) => {
        if (!url) return ''
        if (url.startsWith('http://') || url.startsWith('https://')) return url
        return `${mediaBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`
    }

    const fetchBrands = async () => {
        try {
            setLoading(true)
            // Fetch only manufacturer brands with pagination
            const response = await fetch(`${API_BASE_URL}/brands?type=manufacturer&page=${page}&limit=${limit}`)
            if (response.ok) {
                const result = await response.json()
                const data = result.data || result
                setBrands(data.brands || [])
                setTotal(data.total || 0)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBrands()
    }, [page, limit])

    const handleOpenModal = (brand = null) => {
        if (brand) {
            setEditingBrand(brand)
            setNewItem({
                name: brand.name,
                description: brand.description || '',
                logo: brand.logo || '',
                type: 'manufacturer',
                status: brand.status || 'active'
            })
        } else {
            setEditingBrand(null)
            setNewItem({ name: '', description: '', logo: '', type: 'manufacturer', status: 'active' })
        }
        setShowModal(true)
    }

    const handleLogoUpload = async (files) => {
        const file = Array.isArray(files) ? files[files.length - 1] : null
        if (!file || !session?.accessToken) return
        setUploading(true)
        try {
            const uploaded = await mediaAPI.upload([file], 'product', session.accessToken)
            const items = uploaded?.data || []
            const logoUrl = Array.isArray(items) && items.length ? items[0].url : ''
            setNewItem(prev => ({ ...prev, logo: logoUrl }))
        } catch (error) {
            console.error(error)
            alert('Failed to upload image')
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        if (!session?.accessToken) return
        if (!newItem.name) {
            alert('Please enter a name')
            return
        }
        try {
            const url = editingBrand
                ? `${API_BASE_URL}/brands/${editingBrand._id}`
                : `${API_BASE_URL}/brands`

            const response = await fetch(url, {
                method: editingBrand ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newItem),
            })

            if (response.ok) {
                setShowModal(false)
                setEditingBrand(null)
                setNewItem({ name: '', description: '', logo: '', type: 'manufacturer', status: 'active' })
                fetchBrands()
            } else {
                alert('Failed to save brand')
            }
        } catch (error) {
            console.error(error)
            alert('Failed to save brand')
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
                `${API_BASE_URL}/brands/${deletingId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${session.accessToken}`,
                    },
                }
            )

            if (response.ok) {
                fetchBrands()
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

    // Pagination handlers
    const totalPages = Math.ceil(total / limit)
    const handlePrev = () => setPage(p => Math.max(1, p - 1))
    const handleNext = () => setPage(p => Math.min(totalPages, p + 1))

    if (loading && brands.length === 0) return <div className="text-center py-5"><Spinner animation="border" /></div>

    return (
        <>
            <PageTItle title="MANUFACTURER BRANDS" />
            <Row>
                <Col xs={12}>
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-end mb-3">
                                <Button variant="primary" onClick={() => handleOpenModal()}>Add Manufacturer Brand</Button>
                            </div>
                            <div className="table-responsive">
                                <Table hover responsive className="table-nowrap mb-0 align-middle">
                                    <thead>
                                        <tr>
                                            <th>Logo</th>
                                            <th>Name</th>
                                            <th>Slug</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {brands.map((item) => (
                                            <tr key={item._id}>
                                                <td>
                                                    {item.logo ? (
                                                        <img src={resolveMediaUrl(item.logo)} alt={item.name} className="rounded border" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>{item.name}</td>
                                                <td>{item.slug || '-'}</td>
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
                                        {brands.length === 0 && !loading && <tr><td colSpan="5" className="text-center">No manufacturer brands found</td></tr>}
                                    </tbody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    <span className="me-3 text-muted small">
                                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                                    </span>
                                    <Pagination className="mb-0">
                                        <Pagination.Prev onClick={handlePrev} disabled={page === 1} />
                                        {[...Array(totalPages)].map((_, i) => (
                                            <Pagination.Item
                                                key={i + 1}
                                                active={i + 1 === page}
                                                onClick={() => setPage(i + 1)}
                                            >
                                                {i + 1}
                                            </Pagination.Item>
                                        ))}
                                        <Pagination.Next onClick={handleNext} disabled={page === totalPages} />
                                    </Pagination>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingBrand ? 'Edit' : 'Add'} Manufacturer Brand</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="d-block">Brand Logo</Form.Label>
                            {newItem.logo ? (
                                <div className="position-relative d-inline-block">
                                    <img
                                        src={resolveMediaUrl(newItem.logo)}
                                        alt="Brand Logo"
                                        className="rounded border"
                                        style={{ width: 140, height: 140, objectFit: 'cover' }}
                                    />
                                    <Button
                                        type="button"
                                        variant="light"
                                        className="position-absolute top-0 start-100 translate-middle p-0 rounded-circle border"
                                        style={{ width: 26, height: 26 }}
                                        onClick={() => setNewItem((prev) => ({ ...prev, logo: '' }))}
                                        title="Remove logo"
                                    >
                                        <IconifyIcon icon="mdi:close" width={16} height={16} />
                                    </Button>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    <DropzoneFormInput
                                        text="Drag & drop logo here, or click to upload"
                                        textClassName="fs-6"
                                        className="py-4"
                                        iconProps={{ icon: 'bx:cloud-upload', width: 28, height: 28 }}
                                        showPreview={false}
                                        maxFiles={1}
                                        onFileUpload={handleLogoUpload}
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
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={3} value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
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

            <MediaPickerModal
                open={showMediaPicker}
                onClose={() => setShowMediaPicker(false)}
                multiple={false}
                usedIn="product"
                onSelect={(items) => {
                    const selected = items[0]
                    if (selected?.url) {
                        setNewItem((prev) => ({ ...prev, logo: selected.url }))
                    }
                }}
            />

            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete this manufacturer brand?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                </Modal.Footer>
            </Modal>
        </>
    )
}

export default ManufacturerBrandsPage
