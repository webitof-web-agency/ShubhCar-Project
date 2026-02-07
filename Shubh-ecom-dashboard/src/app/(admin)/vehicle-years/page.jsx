'use client'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row, Button } from 'react-bootstrap'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL } from '@/helpers/apiBase'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import useAPI from '@/hooks/useAPI'
import DataTable from '@/components/shared/DataTable'
import CRUDModal from '@/components/shared/CRUDModal'
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal'

const VehicleYearsPage = () => {
    const { data: session } = useSession()
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    // Data Fetching
    const { data: years, loading, execute: fetchYears } = useAPI(
        () => fetch(`${API_BASE_URL}/vehicle-years?limit=200`, {
            headers: { Authorization: `Bearer ${session?.accessToken}` }
        }).then(res => res.json()).then(res => res.data?.items || res.items || []),
        { onError: (err) => console.error('Fetch failed:', err) }
    )

    // Save Operation
    const { execute: saveYear, loading: saving } = useAPI(
        (formData, id) => {
            const url = id 
                ? `${API_BASE_URL}/vehicle-years/${id}` 
                : `${API_BASE_URL}/vehicle-years`
            return fetch(url, {
                method: id ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...formData, year: Number(formData.year) })
            }).then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to save')))
        },
        { 
            showSuccessToast: true, 
            successMessage: 'Year saved successfully!' 
        }
    )

    // Delete Operation
    const { execute: deleteYear, loading: deleting } = useAPI(
        (id) => fetch(`${API_BASE_URL}/vehicle-years/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session?.accessToken}` }
        }).then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to delete'))),
        { 
            showSuccessToast: true, 
            successMessage: 'Year deleted successfully!' 
        }
    )

    const handleOpenModal = (item = null) => {
        setEditingItem(item)
        setShowModal(true)
    }

    const handleSubmit = async (formData) => {
        await saveYear(formData, editingItem?._id)
        setShowModal(false)
        fetchYears()
    }

    const handleDeleteClick = (id) => {
        setDeletingId(id)
        setShowDeleteModal(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deletingId) return
        await deleteYear(deletingId)
        setShowDeleteModal(false)
        fetchYears()
    }

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
                            
                            <DataTable
                                columns={[
                                    { key: 'year', label: 'Year', render: (item) => item.year },
                                    { key: 'status', label: 'Status', render: (item) => (
                                        <span className={`badge px-3 py-2 rounded-pill fs-12 fw-medium ${
                                            item.status === 'active' 
                                            ? 'bg-success-subtle text-success' 
                                            : 'bg-danger-subtle text-danger'
                                        }`}>
                                            {item.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    )},
                                    { key: 'actions', label: 'Action', render: (item) => (
                                        <div className="d-flex gap-2">
                                            <Button 
                                                size="sm" variant="link" className="p-0 text-primary" 
                                                onClick={() => handleOpenModal(item)} 
                                                title="Edit"
                                            >
                                                <IconifyIcon icon="solar:pen-new-square-bold-duotone" width={20} height={20} />
                                            </Button>
                                            <Button 
                                                size="sm" variant="link" className="p-0 text-danger" 
                                                onClick={() => handleDeleteClick(item._id)} 
                                                title="Delete"
                                            >
                                                <IconifyIcon icon="solar:trash-bin-trash-bold" width={20} height={20} />
                                            </Button>
                                        </div>
                                    )}
                                ]}
                                data={years || []}
                                loading={loading}
                                emptyMessage="No model years found"
                            />
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <CRUDModal
                show={showModal}
                onHide={() => setShowModal(false)}
                title={`${editingItem ? 'Edit' : 'Add'} Model Year`}
                fields={[
                    { name: 'year', label: 'Year', type: 'number', placeholder: 'e.g., 2022', required: true },
                    { 
                        name: 'status', label: 'Status', type: 'select', 
                        options: [
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' }
                        ]
                    }
                ]}
                initialData={editingItem || { year: '', status: 'active' }}
                onSubmit={handleSubmit}
                submitting={saving}
            />

            <DeleteConfirmModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteConfirm}
                itemName="Year"
                deleting={deleting}
            />
        </>
    )
}

export default VehicleYearsPage
