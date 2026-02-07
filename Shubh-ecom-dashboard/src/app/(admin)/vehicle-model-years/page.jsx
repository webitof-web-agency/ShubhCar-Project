'use client'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row, Spinner, Button } from 'react-bootstrap'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL } from '@/helpers/apiBase'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import DataTable from '@/components/shared/DataTable'
import CRUDModal from '@/components/shared/CRUDModal'
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal'
import useAPI from '@/hooks/useAPI'

const VehicleModelYearsPage = () => {
  const { data: session } = useSession()
  const [years, setYears] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [error, setError] = useState(null)


  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // useAPI hook for DELETE operation
  const { execute: deleteYear, loading: deleting } = useAPI(
    (id) => fetch(`${API_BASE_URL}/vehicle-model-years/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.accessToken}` }
    }).then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to delete'))),
    { showSuccessToast: true, successMessage: 'Model year deleted successfully!' }
  )

  // useAPI hook for POST/PUT operation
  const { execute: saveYear, loading: submitting } = useAPI(
    (formData, id) => {
      const url = id ? `${API_BASE_URL}/vehicle-model-years/${id}` : `${API_BASE_URL}/vehicle-model-years`
      return fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...formData, year: Number(formData.year) })
      }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(new Error(err.message || 'Failed to save'))))
    },
    { showSuccessToast: true, successMessage: 'Model year saved successfully!' }
  )

  const modelMap = useMemo(() => {
    const map = new Map()
    models.forEach((m) => map.set(m._id, m))
    return map
  }, [models])

  const fetchModels = async () => {
    if (!session?.accessToken) return
    const response = await fetch(`${API_BASE_URL}/vehicle-models?limit=200`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    if (response.ok) {
      const result = await response.json()
      setModels(result.data?.items || result.items || [])
    }
  }

  const fetchYears = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicle-model-years?limit=200`, {
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
      fetchModels()
      fetchYears()
    } else {
      setLoading(false)
    }
  }, [session])

  const handleOpenModal = (item = null) => {
    setEditingItem(item)
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = async (formData) => {
    if (!session?.accessToken) return
    try {
      await saveYear(formData, editingItem?._id)
      setShowModal(false)
      setEditingItem(null)
      fetchYears()
    } catch (error) {
      console.error('Save failed:', error)
      setError(error.message || 'Failed to save')
    }
  }

  const handleDelete = (id) => {
    setDeletingId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      await deleteYear(deletingId)
      fetchYears()
      setShowDeleteModal(false)
      setDeletingId(null)
    } catch (error) {
      console.error('Delete failed:', error)
      // Error toast already shown by useAPI
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
              <DataTable
                columns={[
                  { key: 'model', label: 'Model', render: (item) => modelMap.get(item.modelId)?.name || 'N/A' },
                  { key: 'year', label: 'Year', render: (item) => item.year },
                  { key: 'status', label: 'Status', render: (item) => (
                    <span className={`badge px-3 py-2 rounded-pill fs-12 fw-medium ${item.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                      {item.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  )},
                  { key: 'actions', label: 'Action', render: (item) => (
                    <div className="d-flex gap-2">
                      <Button size="sm" variant="link" className="p-0 text-primary" onClick={() => handleOpenModal(item)} title="Edit">
                        <IconifyIcon icon="solar:pen-new-square-bold-duotone" width={20} height={20} />
                      </Button>
                      <Button size="sm" variant="link" className="p-0 text-danger" onClick={() => handleDelete(item._id)} title="Delete">
                        <IconifyIcon icon="solar:trash-bin-trash-bold" width={20} height={20} />
                      </Button>
                    </div>
                  )}
                ]}
                data={years}
                loading={loading}
                emptyMessage="No years found"
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <CRUDModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSubmit={handleSubmit}
        title={`${editingItem ? 'Edit' : 'Add'} Model Year`}
        editMode={!!editingItem}
        initialData={editingItem ? { modelId: editingItem.modelId, year: String(editingItem.year), status: editingItem.status } : {}}
        submitting={submitting}
        error={error}
        icon="solar:calendar-bold-duotone"
        fields={[
          {
            name: 'modelId',
            label: 'Model',
            type: 'select',
            required: true,
            options: models.map(m => ({ value: m._id, label: m.name }))
          },
          {
            name: 'year',
            label: 'Year',
            type: 'number',
            required: true,
            placeholder: 'e.g., 2022',
            min: 1900,
            max: 2100
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]
          }
        ]}
      />

      <DeleteConfirmModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        itemName={years.find(y => y._id === deletingId)?.year?.toString()}
        itemType="model year"
        deleting={deleting}
      />
    </>
  )
}

export default VehicleModelYearsPage
