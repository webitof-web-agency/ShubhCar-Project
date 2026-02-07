'use client'
import PageTItle from '@/components/PageTItle'
import{ Card, CardBody, Col, Row, Spinner, Button, Form, Modal, Badge } from 'react-bootstrap'
import { entriesAPI } from '@/helpers/entriesApi'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { toast } from 'react-toastify'
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal'
import DataTable from '@/components/shared/DataTable'
const escapeCsvValue = (value) => {
    const text = value == null ? '' : String(value)
    return `"${text.replace(/"/g, '""')}"`
}

const buildCsv = (rows, headers) => {
    const headerLine = headers.join(',')
    const dataLines = rows.map((row) =>
        headers.map((key) => escapeCsvValue(row[key])).join(',')
    )
    return [headerLine, ...dataLines].join('\n')
}

const EntriesPage = () => {
    const { data: session } = useSession()
    const [entries, setEntries] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ today: 0, last7Days: 0, last30Days: 0, total: 0 })
    const [viewEntry, setViewEntry] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [entryToDelete, setEntryToDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        search: ''
    })

    const fetchStats = async () => {
        if (session?.accessToken) {
            try {
                const response = await entriesAPI.stats(session.accessToken)
                setStats(response.data)
            } catch (error) {
                console.error('Failed to fetch stats', error)
            }
        }
    }

    const fetchEntries = async () => {
        if (session?.accessToken) {
            setLoading(true)
            try {
                const response = await entriesAPI.list(filters, session.accessToken)
                setEntries(response.data.entries || [])
            } catch (error) {
                console.error(error)
                toast.error('Failed to load entries')
            } finally {
                setLoading(false)
            }
        }
    }

    useEffect(() => {
        if (session) {
            fetchStats()
            fetchEntries()
        }
    }, [session]) // Initial load

    useEffect(() => {
        // Debounce search or apply filters
        const timeout = setTimeout(() => {
            if (session) fetchEntries()
        }, 500)
        return () => clearTimeout(timeout)
    }, [filters, session])

    const handleDeleteClick = (id) => {
        const entry = entries.find(e => e._id === id)
        setEntryToDelete(entry)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!entryToDelete) return
        try {
            setDeleting(true)
            await entriesAPI.delete(entryToDelete._id, session.accessToken)
            toast.success('Entry deleted')
            fetchEntries()
            fetchStats()
            if (showModal && viewEntry?._id === entryToDelete._id) {
                setShowModal(false)
                setViewEntry(null)
            }
            setShowDeleteModal(false)
            setEntryToDelete(null)
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete')
        } finally {
            setDeleting(false)
        }
    }

    const handleDelete = handleDeleteClick

    // Mark as read
    const handleMarkRead = async (id) => {
        try {
            await entriesAPI.markRead(id, session.accessToken)
            fetchEntries()
            if (viewEntry && viewEntry._id === id) {
                setViewEntry(prev => ({ ...prev, status: 'read' }))
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleView = (entry) => {
        setViewEntry(entry)
        setShowModal(true)
        if (entry.status === 'new') {
            handleMarkRead(entry._id)
        }
    }

    const handleExport = async () => {
        if (!session?.accessToken) return;
        try {
            const toastId = toast.loading('Exporting data...');
            const response = await entriesAPI.list({ ...filters, limit: 'all' }, session.accessToken);
            const dataToExport = response.data.entries.map(entry => ({
                'Date': new Date(entry.createdAt).toLocaleString(),
                'Name': entry.name,
                'Email': entry.email,
                'Phone': entry.phone || 'N/A',
                'Subject': entry.subject,
                'Message': entry.message,
                'Status': entry.status,
                'IP Address': entry.ip || 'N/A',
                'Browser': entry.browser || 'N/A',
                'OS': entry.os || 'N/A',
                'User Type': entry.isGuest ? 'Guest' : 'Registered',
                'User Agent': entry.userAgent || 'N/A'
            }));

            const headers = Object.keys(dataToExport[0] || {})
            const csv = buildCsv(dataToExport, headers)
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            link.href = window.URL.createObjectURL(blob)
            link.download = `Contact_Entries_${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(link)
            link.click()
            link.remove()
            toast.dismiss(toastId);
            toast.success('Export successful');
        } catch (error) {
            console.error(error);
            toast.error('Export failed');
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <>
            <PageTItle title="Entries (Contact Form)" />

            {/* Stats Cards */}
            <Row className="mb-1">
                <Col md={3}>
                    <Card className="bg-primary text-white">
                        <CardBody className="p-3">
                            <h5 className="mb-1 text-white-50">Today</h5>
                            <h3 className="mb-0 text-white">{stats.today}</h3>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="bg-info text-white">
                        <CardBody className="p-3">
                            <h5 className="mb-1 text-white-50">Last 7 Days</h5>
                            <h3 className="mb-0 text-white">{stats.last7Days}</h3>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="bg-warning text-white">
                        <CardBody className="p-3">
                            <h5 className="mb-1 text-white-50">Last 30 Days</h5>
                            <h3 className="mb-0 text-white">{stats.last30Days}</h3>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="bg-success text-white">
                        <CardBody className="p-3">
                            <h5 className="mb-1 text-white-50">Total Entries</h5>
                            <h3 className="mb-0 text-white">{stats.total}</h3>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <Row className="mb-1">
                <Col xs={12}>
                    <Card>
                        <CardBody>
                            <Row className="g-3">
                                <Col md={3}>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search name, email, subject..."
                                        name="search"
                                        value={filters.search}
                                        onChange={handleFilterChange}
                                    />
                                </Col>
                                <Col md={3}>
                                    <Form.Control
                                        type="date"
                                        name="startDate"
                                        value={filters.startDate}
                                        onChange={handleFilterChange}
                                    />
                                </Col>
                                <Col md={3}>
                                    <Form.Control
                                        type="date"
                                        name="endDate"
                                        value={filters.endDate}
                                        onChange={handleFilterChange}
                                    />
                                </Col>
                                <Col md={3}>
                                <Button variant="success" onClick={handleExport} className="w-100">
                                    <IconifyIcon icon="mdi:file-delimited" className="me-1" /> Export CSV
                                </Button>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col xs={12}>
                    <Card>
                        <CardBody>
                            {loading ? (
                                <div className="text-center py-5"><Spinner animation="border" /></div>
                            ) : (
                        <DataTable
                          columns={[
                            { key: 'date', label: 'Date', render: (entry) => (
                              <>
                                {new Date(entry.createdAt).toLocaleDateString()}
                                <br />
                                <small className="text-muted">{new Date(entry.createdAt).toLocaleTimeString()}</small>
                              </>
                            )},
                            { key: 'name', label: 'Name', render: (entry) => (
                              <>
                                {entry.name}
                                {entry.isGuest && <Badge bg="secondary" className="ms-1" style={{ fontSize: '10px' }}>Guest</Badge>}
                              </>
                            )},
                            { key: 'email', label: 'Email', render: (entry) => entry.email },
                            { key: 'subject', label: 'Subject', render: (entry) => entry.subject || '-' },
                            { key: 'status', label: 'Status', render: (entry) => (
                              <Badge bg={entry.status === 'new' ? 'danger' : entry.status === 'read' ? 'info' : 'success'}>
                                {entry.status?.toUpperCase()}
                              </Badge>
                            )},
                            { key: 'actions', label: 'Action', render: (entry) => (
                              <>
                                <Button size="sm" variant="light" className="me-1" onClick={() => handleView(entry)}>
                                  <IconifyIcon icon="mdi:eye" />
                                </Button>
                                <Button size="sm" variant="soft-danger" onClick={() => handleDeleteClick(entry._id)}>
                                  <IconifyIcon icon="mdi:trash-can-outline" />
                                </Button>
                              </>
                            )}
                          ]}
                          data={entries}
                          loading={loading}
                          emptyMessage="No entries found"
                        />
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* View Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Entry Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {viewEntry && (
                        <div>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <p className="mb-1 text-muted small">From</p>
                                    <h5 className="mb-0">{viewEntry.name}</h5>
                                    <p className="mb-0">{viewEntry.email}</p>
                                    <p className="mb-0">{viewEntry.phone}</p>
                                </Col>
                                <Col md={6} className="text-end">
                                    <p className="mb-1 text-muted small">Date</p>
                                    <h5>{new Date(viewEntry.createdAt).toLocaleString()}</h5>
                                    <Badge bg={viewEntry.isGuest ? 'secondary' : 'primary'}>
                                        {viewEntry.isGuest ? 'GUEST USER' : 'REGISTERED USER'}
                                    </Badge>
                                </Col>
                            </Row>
                            <hr />
                            <div className="mb-4">
                                <h6 className="text-muted mb-1">Subject</h6>
                                <p className="fw-medium">{viewEntry.subject}</p>
                            </div>
                            <div className="mb-4 bg-light p-3 rounded">
                                <h6 className="text-muted mb-1">Message</h6>
                                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{viewEntry.message}</p>
                            </div>
                            <hr />
                            <h6 className="text-muted mb-2">Technical Details</h6>
                            <Row className="g-3">
                                <Col md={4}>
                                    <div className="p-2 border rounded">
                                        <small className="d-block text-muted mb-1">IP Address</small>
                                        <div className="d-flex flex-column gap-1 px-50">
                                            {(viewEntry.ip || 'N/A').split(',').map((ip, idx) => (
                                                <Badge 
                                                    key={idx} 
                                                    bg="light" 
                                                    text="dark" 
                                                    className="text-start px-10"
                                                    style={{ 
                                                        wordBreak: 'break-all', 
                                                        fontSize: '11px',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 'normal'
                                                    }}
                                                >
                                                    {ip.trim()}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="p-2 border rounded">
                                        <small className="d-block text-muted">Browser</small>
                                        <strong style={{ wordBreak: 'break-word', fontSize: '14px' }}>{viewEntry.browser || 'N/A'}</strong>
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="p-2 border rounded">
                                        <small className="d-block text-muted">OS</small>
                                        <strong style={{ wordBreak: 'break-word', fontSize: '14px' }}>{viewEntry.os || 'N/A'}</strong>
                                    </div>
                                </Col>
                                <Col md={12}>
                                    <div className="p-2 border rounded">
                                        <small className="d-block text-muted">User Agent</small>
                                        <code className="small" style={{ wordBreak: 'break-all', display: 'block', whiteSpace: 'normal' }}>{viewEntry.userAgent || 'N/A'}</code>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={() => handleDelete(viewEntry._id)}>
                        Delete Entry
                    </Button>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            <DeleteConfirmModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                itemType="contact entry"
                itemName={entryToDelete?.name || entryToDelete?.email}
                deleting={deleting}
            />
        </>
    )
}

export default EntriesPage

