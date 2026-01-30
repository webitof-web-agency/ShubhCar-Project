'use client'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row, Spinner, Table, Button, Form, Modal } from 'react-bootstrap'
import { brandsAPI } from '@/helpers/brandsApi'
import { mediaAPI } from '@/helpers/mediaApi'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import MediaPickerModal from '@/components/media/MediaPickerModal'

const BrandsPage = () => {
    const { data: session } = useSession()
    const [brands, setBrands] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [newItem, setNewItem] = useState({ name: '', description: '', logo: '' })
    const [uploading, setUploading] = useState(false)
    const [showMediaPicker, setShowMediaPicker] = useState(false)

    const fetchBrands = async () => {
        try {
            const response = await brandsAPI.list() // Public list usually
            setBrands(response?.data?.brands || response?.brands || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBrands()
    }, [])

    const handleSave = async () => {
        if (!session?.accessToken) return
        try {
            await brandsAPI.create(newItem, session.accessToken)
            setShowModal(false)
            setNewItem({ name: '', description: '', logo: '' })
            fetchBrands()
        } catch (error) {
            console.error(error)
            alert('Failed to save')
        }
    }

    const handleLogoUpload = async (event) => {
        const file = event.target.files?.[0]
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
            event.target.value = ''
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this brand?')) return
        try {
            await brandsAPI.delete(id, session.accessToken)
            fetchBrands()
        } catch (error) {
            console.error(error)
        }
    }

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>

    return (
        <>
            <PageTItle title="BRANDS" />
            <Row>
                <Col xs={12}>
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-end mb-3">
                                <Button variant="primary" onClick={() => setShowModal(true)}>Add Brand</Button>
                            </div>
                            <div className="table-responsive">
                                <Table hover responsive className="table-nowrap mb-0">
                                    <thead>
                                        <tr>
                                            <th>Logo</th>
                                            <th>Name</th>
                                            <th>Slug</th>
                                            <th>Description</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {brands.map((item) => (
                                            <tr key={item._id}>
                                                <td>
                                                    {item.logo ? (
                                                        <img src={item.logo} alt={item.name} className="rounded border" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>{item.name}</td>
                                                <td>{item.slug}</td>
                                                <td>{item.description}</td>
                                                <td>
                                                    <Button size="sm" variant="danger" onClick={() => handleDelete(item._id)}>Delete</Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {brands.length === 0 && <tr><td colSpan="5" className="text-center">No brands found</td></tr>}
                                    </tbody>
                                </Table>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton><Modal.Title>Add Brand</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Brand Logo</Form.Label>
                            <div className="d-flex align-items-center gap-3 flex-wrap">
                                <Form.Control type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                                {newItem.logo && (
                                    <img src={newItem.logo} alt="Brand Logo" className="rounded border" style={{ width: 56, height: 56, objectFit: 'cover' }} />
                                )}
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => setShowMediaPicker(true)}
                                    disabled={uploading}
                                >
                                    Choose from Media Library
                                </Button>
                            </div>
                            {uploading && <div className="text-muted mt-2">Uploading...</div>}
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={3} value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
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
                        setNewItem(prev => ({ ...prev, logo: selected.url }))
                    }
                }}
            />
        </>
    )
}

export default BrandsPage
