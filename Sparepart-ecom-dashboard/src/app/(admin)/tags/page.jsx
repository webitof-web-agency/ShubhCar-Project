'use client'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row, Spinner, Table, Button, Form, Modal } from 'react-bootstrap'
import { tagsAPI } from '@/helpers/tagsApi'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

const TagsPage = () => {
    const { data: session } = useSession()
    const [tags, setTags] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [newItem, setNewItem] = useState({ name: '' })

    const fetchTags = async () => {
        try {
            const response = await tagsAPI.list()
            setTags(response?.data?.tags || response?.tags || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTags()
    }, [])

    const handleSave = async () => {
        if (!session?.accessToken) return
        try {
            await tagsAPI.create(newItem, session.accessToken)
            setShowModal(false)
            setNewItem({ name: '' })
            fetchTags()
        } catch (error) {
            console.error(error)
            alert('Failed to save')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this tag?')) return
        try {
            await tagsAPI.delete(id, session.accessToken)
            fetchTags()
        } catch (error) {
            console.error(error)
        }
    }

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>

    return (
        <>
            <PageTItle title="TAGS" />
            <Row>
                <Col xs={12}>
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-end mb-3">
                                <Button variant="primary" onClick={() => setShowModal(true)}>Add Tag</Button>
                            </div>
                            <div className="table-responsive">
                                <Table hover responsive className="table-nowrap mb-0">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Slug</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tags.map((item) => (
                                            <tr key={item._id}>
                                                <td>{item.name}</td>
                                                <td>{item.slug}</td>
                                                <td>
                                                    <Button size="sm" variant="danger" onClick={() => handleDelete(item._id)}>Delete</Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {tags.length === 0 && <tr><td colSpan="3" className="text-center">No tags found</td></tr>}
                                    </tbody>
                                </Table>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton><Modal.Title>Add Tag</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    <Button variant="primary" onClick={handleSave}>Save</Button>
                </Modal.Footer>
            </Modal>
        </>
    )
}

export default TagsPage
