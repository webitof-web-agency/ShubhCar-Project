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

const VehicleVariantsPage = () => {
  const { data: session } = useSession()
  const [variants, setVariants] = useState([])
  const [modelYears, setModelYears] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [error, setError] = useState(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // useAPI hook for DELETE operation
  const { execute: deleteVariant, loading: deleting } = useAPI(
    (id) => fetch(`${API_BASE_URL}/vehicle-variants/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.accessToken}` }
    }).then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to delete'))),
    { showSuccessToast: true, successMessage: 'Variant deleted successfully!' }
  )

  // useAPI hook for POST/PUT operation
  const { execute: saveVariant, loading: submitting } = useAPI(
    (formData, id) => {
      const url = id ? `${API_BASE_URL}/vehicle-variants/${id}` : `${API_BASE_URL}/vehicle-variants`
      return fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(new Error(err.message || 'Failed to save'))))
    },
    { showSuccessToast: true, successMessage: 'Variant saved successfully!' }
  )

  const modelMap = useMemo(() => {
    const map = new Map()
    models.forEach((m) => map.set(m._id, m))
    return map
  }, [models])

  const modelYearMap = useMemo(() => {
    const map = new Map()
    modelYears.forEach((y) => map.set(y._id, y))
    return map
  }, [modelYears])

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

  const fetchModelYears = async () => {
    if (!session?.accessToken) return
    const response = await fetch(`${API_BASE_URL}/vehicle-model-years?limit=500`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    if (response.ok) {
      const result = await response.json()
      setModelYears(result.data?.items || result.items || [])
    }
  }

  const fetchVariants = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicle-variants?limit=500`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      })
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        setVariants(data.items || [])
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
      fetchModelYears()
      fetchVariants()
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
      await saveVariant(formData, editingItem?._id)
      setShowModal(false)
      setEditingItem(null)
      fetchVariants()
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
      await deleteVariant(deletingId)
      fetchVariants()
      setShowDeleteModal(false)
      setDeletingId(null)
    } catch (error) {
      console.error('Delete failed:', error)
      // Error toast already shown by useAPI
    }
  }

  const formatModelYear = (modelYearId) => {
    const modelYear = modelYearMap.get(modelYearId)
    if (!modelYear) return 'N/A'
    const model = modelMap.get(modelYear.modelId)
    return model ? `${model.name} ${modelYear.year}` : String(modelYear.year)
  }

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>

  return (
    <>
      <PageTItle title="VEHICLE VARIANTS" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-end mb-3">
                <Button variant="primary" onClick={() => handleOpenModal()}>Add Variant</Button>
              </div>
              <DataTable
                columns={[
                  { key: 'modelYear', label: 'Model Year', render: (item) => formatModelYear(item.modelYearId) },
                  { key: 'name', label: 'Variant', render: (item) => item.name },
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
                data={variants}
                loading={loading}
                emptyMessage="No variants found"
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <CRUDModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSubmit={handleSubmit}
        title={`${editingItem ? 'Edit' : 'Add'} Variant`}
        editMode={!!editingItem}
        initialData={editingItem || {}}
        submitting={submitting}
        error={error}
        icon="solar:settings-bold-duotone"
        fields={[
          {
            name: 'modelYearId',
            label: 'Model Year',
            type: 'select',
            required: true,
            options: modelYears.map(my => ({ value: my._id, label: formatModelYear(my._id) }))
          },
          {
            name: 'name',
            label: 'Variant Name',
            type: 'text',
            required: true,
            placeholder: 'e.g., VXi, ZX, Diesel'
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
        itemName={variants.find(v => v._id === deletingId)?.name}
        itemType="variant"
        deleting={deleting}
      />
    </>
  )
}

export default VehicleVariantsPage
