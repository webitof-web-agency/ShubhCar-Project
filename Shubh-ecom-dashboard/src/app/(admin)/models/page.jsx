'use client'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row, Spinner, Button } from 'react-bootstrap'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL, API_ORIGIN } from '@/helpers/apiBase'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { mediaAPI } from '@/helpers/mediaApi'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import MediaPickerModal from '@/components/media/MediaPickerModal'
import DataTable from '@/components/shared/DataTable'
import CRUDModal from '@/components/shared/CRUDModal'
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal'
import useAPI from '@/hooks/useAPI'

const ModelsPage = () => {
  const { data: session } = useSession()
  const [models, setModels] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingModel, setEditingModel] = useState(null)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState('')
  
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // useAPI hook for DELETE operation
  const { execute: deleteModel, loading: deleting } = useAPI(
    (id) => fetch(`${API_BASE_URL}/vehicle-models/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.accessToken}` }
    }).then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to delete'))),
    { showSuccessToast: true, successMessage: 'Model deleted successfully!' }
  )

  // useAPI hook for POST/PUT operation
  const { execute: saveModel, loading: submitting } = useAPI(
    (formData, imageUrl, id) => {
      const url = id ? `${API_BASE_URL}/vehicle-models/${id}` : `${API_BASE_URL}/vehicle-models`
      return fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...formData, image: imageUrl })
      }).then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(new Error(err.message || 'Failed to save'))))
    },
    { showSuccessToast: true, successMessage: 'Model saved successfully!' }
  )

  const mediaBaseUrl = API_ORIGIN

  const resolveMediaUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${mediaBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`
  }

  const brandMap = useMemo(() => {
    const map = new Map()
    const list = Array.isArray(brands) ? brands : []
    list.forEach((b) => map.set(b._id, b))
    return map
  }, [brands])

  const fetchBrands = async () => {
    if (!session?.accessToken) return
    const response = await fetch(`${API_BASE_URL}/vehicle-brands?limit=200`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    if (response.ok) {
      const result = await response.json()
      const data = result?.data || result
      const list = data?.items || data?.brands || data || []
      setBrands(Array.isArray(list) ? list : [])
    }
  }

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicle-models?limit=200`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      })
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        setModels(data.items || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.accessToken) {
      fetchBrands()
      fetchModels()
    } else {
      setLoading(false)
    }
  }, [session])

  const handleOpenModal = (model = null) => {
    setEditingModel(model)
    setTempImageUrl(model?.image || '')
    setError(null)
    setShowModal(true)
  }

  const handleImageUpload = async (files) => {
    const file = Array.isArray(files) ? files[files.length - 1] : null
    if (!file || !session?.accessToken) return
    setUploading(true)
    try {
      const uploaded = await mediaAPI.upload([file], 'product', session.accessToken)
      const items = uploaded?.data || []
      const imageUrl = Array.isArray(items) && items.length ? items[0].url : ''
      setTempImageUrl(imageUrl)
    } catch (error) {
      console.error(error)
      alert('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (formData) => {
    if (!session?.accessToken) return
    try {
      await saveModel(formData, tempImageUrl, editingModel?._id)
      setShowModal(false)
      setEditingModel(null)
      setTempImageUrl('')
      fetchModels()
    } catch (error) {
      console.error('Save failed:', error)
      setError(error.message || 'Failed to save model')
    }
  }

  const handleDelete = (id) => {
    setDeletingId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      await deleteModel(deletingId)
      fetchModels()
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
      <PageTItle title="VEHICLE MODELS" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-end mb-3">
                <Button variant="primary" onClick={() => handleOpenModal()}>Add Model</Button>
              </div>
              <DataTable
                columns={[
                  { key: 'brand', label: 'Brand', render: (item) => brandMap.get(item.brandId)?.name || 'N/A' },
                  { key: 'name', label: 'Model', render: (item) => item.name },
                  { key: 'image', label: 'Image', render: (item) => (
                    item.image ? (
                      <img src={resolveMediaUrl(item.image)} alt={item.name} className="rounded border" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                    ) : <span className="text-muted">No image</span>
                  )},
                  { key: 'status', label: 'Status', render: (item) => (
                    <span
                      className={`badge px-3 py-2 rounded-pill fs-12 fw-medium ${item.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                      style={{ backgroundColor: item.status === 'active' ? '#e6fffa' : '#fff5f5', color: item.status === 'active' ? '#00b894' : '#ff7675' }}
                    >
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
                data={models}
                loading={loading}
                emptyMessage="No models found"
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <CRUDModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSubmit={handleSubmit}
        title={`${editingModel ? 'Edit' : 'Add'} Vehicle Model`}
        editMode={!!editingModel}
        initialData={editingModel || {}}
        submitting={submitting}
        error={error}
        icon="solar:car-bold-duotone"
        fields={[
          {
            name: 'brandId',
            label: 'Brand',
            type: 'select',
            required: true,
            options: brands.map(b => ({ value: b._id, label: b.name }))
          },
          {
            name: 'name',
            label: 'Model Name',
            type: 'text',
            required: true,
            placeholder: 'e.g., Swift, City'
          },
          {
            name: 'image',
            label: 'Model Image (optional)',
            type: 'custom',
            render: () => (
              tempImageUrl ? (
                <div className="position-relative d-inline-block">
                  <img
                    src={resolveMediaUrl(tempImageUrl)}
                    alt="Model"
                    className="rounded border"
                    style={{ width: 140, height: 140, objectFit: 'cover' }}
                  />
                  <Button
                    type="button"
                    variant="light"
                    className="position-absolute top-0 start-100 translate-middle p-0 rounded-circle border"
                    style={{ width: 26, height: 26 }}
                    onClick={() => setTempImageUrl('')}
                    title="Remove image"
                  >
                    <IconifyIcon icon="mdi:close" width={16} height={16} />
                  </Button>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  <DropzoneFormInput
                    text="Drag & drop image here, or click to upload"
                    textClassName="fs-6"
                    className="py-4"
                    iconProps={{ icon: 'bx:cloud-upload', width: 28, height: 28 }}
                    showPreview={false}
                    maxFiles={1}
                    onFileUpload={handleImageUpload}
                  />
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setShowMediaPicker(true)}
                    disabled={uploading}
                  >
                    Choose from Media Library
                  </Button>
                  {uploading && <div className="text-muted mt-2">Uploading...</div>}
                </div>
              )
            )
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
        itemName={models.find(m => m._id === deletingId)?.name}
        itemType="model"
        deleting={deleting}
      />

      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        multiple={false}
        usedIn="product"
        onSelect={(items) => {
          const selected = items[0]
          if (selected?.url) {
            setTempImageUrl(selected.url)
          }
        }}
      />
    </>
  )
}

export default ModelsPage
