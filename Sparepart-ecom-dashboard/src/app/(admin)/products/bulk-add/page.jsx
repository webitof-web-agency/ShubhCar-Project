'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE_URL } from '@/helpers/apiBase'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Form,
  Spinner
} from 'react-bootstrap'

const BulkAddPage = () => {
  const { data: session } = useSession()

  const [createFile, setCreateFile] = useState(null)
  const [createPreview, setCreatePreview] = useState(null)
  const [createErrors, setCreateErrors] = useState([])
  const [createLoading, setCreateLoading] = useState(false)
  const [createJob, setCreateJob] = useState(null)
  const [createJobStatus, setCreateJobStatus] = useState(null)
  const [createStatusLoading, setCreateStatusLoading] = useState(false)
  const [createMessage, setCreateMessage] = useState(null)

  const [updateFile, setUpdateFile] = useState(null)
  const [updatePreview, setUpdatePreview] = useState(null)
  const [updateErrors, setUpdateErrors] = useState([])
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateJob, setUpdateJob] = useState(null)
  const [updateJobStatus, setUpdateJobStatus] = useState(null)
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false)
  const [updateMessage, setUpdateMessage] = useState(null)

  const token = session?.accessToken

  const resetCreateState = () => {
    setCreatePreview(null)
    setCreateErrors([])
    setCreateJob(null)
    setCreateJobStatus(null)
    setCreateMessage(null)
  }

  const resetUpdateState = () => {
    setUpdatePreview(null)
    setUpdateErrors([])
    setUpdateJob(null)
    setUpdateJobStatus(null)
    setUpdateMessage(null)
  }

  const downloadFile = async (url, setMessage) => {
    if (!token) {
      setMessage({ type: 'danger', text: 'Unauthorized. Please login again.' })
      return
    }

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.message || 'Download failed')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="(.+)"/)
      const filename = match?.[1] || 'download.csv'
      const href = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(href)
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'Download failed' })
    }
  }

  const handleCreatePreview = async (e) => {
    e.preventDefault()
    if (!createFile) {
      setCreateMessage({ type: 'danger', text: 'Please select a CSV or XLSX file.' })
      return
    }
    if (!token) {
      setCreateMessage({ type: 'danger', text: 'Unauthorized. Please login again.' })
      return
    }

    try {
      setCreateLoading(true)
      setCreateMessage(null)
      setCreatePreview(null)
      setCreateErrors([])
      const formData = new FormData()
      formData.append('file', createFile)

      const response = await fetch(`${API_BASE_URL}/products/admin/bulk-create/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to generate preview')
      }
      setCreatePreview(payload.data)
      setCreateErrors(payload.data?.errors || [])
    } catch (err) {
      setCreateMessage({ type: 'danger', text: err.message || 'Preview failed' })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCreateConfirm = async () => {
    if (!createPreview?.uploadId) return
    if (!token) {
      setCreateMessage({ type: 'danger', text: 'Unauthorized. Please login again.' })
      return
    }

    try {
      setCreateLoading(true)
      const response = await fetch(`${API_BASE_URL}/products/admin/bulk-create/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uploadId: createPreview.uploadId })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to queue job')
      }
      setCreateJob(payload.data)
      setCreateMessage({ type: 'success', text: 'Bulk create queued successfully.' })
    } catch (err) {
      setCreateMessage({ type: 'danger', text: err.message || 'Failed to queue job' })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCreateStatus = async () => {
    if (!createJob?.jobId) return
    if (!token) return

    try {
      setCreateStatusLoading(true)
      const response = await fetch(`${API_BASE_URL}/products/admin/bulk-create/jobs/${createJob.jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to fetch job status')
      }
      setCreateJobStatus(payload.data)
    } catch (err) {
      setCreateMessage({ type: 'danger', text: err.message || 'Failed to fetch job status' })
    } finally {
      setCreateStatusLoading(false)
    }
  }

  const handleUpdatePreview = async (e) => {
    e.preventDefault()
    if (!updateFile) {
      setUpdateMessage({ type: 'danger', text: 'Please select a CSV or XLSX file.' })
      return
    }
    if (!token) {
      setUpdateMessage({ type: 'danger', text: 'Unauthorized. Please login again.' })
      return
    }

    try {
      setUpdateLoading(true)
      setUpdateMessage(null)
      setUpdatePreview(null)
      setUpdateErrors([])
      const formData = new FormData()
      formData.append('file', updateFile)

      const response = await fetch(`${API_BASE_URL}/products/admin/bulk-update/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to generate preview')
      }
      setUpdatePreview(payload.data)
      setUpdateErrors(payload.data?.errors || [])
    } catch (err) {
      setUpdateMessage({ type: 'danger', text: err.message || 'Preview failed' })
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleUpdateConfirm = async () => {
    if (!updatePreview?.uploadId) return
    if (!token) {
      setUpdateMessage({ type: 'danger', text: 'Unauthorized. Please login again.' })
      return
    }

    try {
      setUpdateLoading(true)
      const response = await fetch(`${API_BASE_URL}/products/admin/bulk-update/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uploadId: updatePreview.uploadId })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to queue job')
      }
      setUpdateJob(payload.data)
      setUpdateMessage({ type: 'success', text: 'Bulk update queued successfully.' })
    } catch (err) {
      setUpdateMessage({ type: 'danger', text: err.message || 'Failed to queue job' })
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!updateJob?.jobId) return
    if (!token) return

    try {
      setUpdateStatusLoading(true)
      const response = await fetch(`${API_BASE_URL}/products/admin/bulk-update/jobs/${updateJob.jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to fetch job status')
      }
      setUpdateJobStatus(payload.data)
    } catch (err) {
      setUpdateMessage({ type: 'danger', text: err.message || 'Failed to fetch job status' })
    } finally {
      setUpdateStatusLoading(false)
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="d-flex align-items-center justify-content-between">
          <CardTitle as="h4" className="mb-0">Bulk Create (Full Product Add)</CardTitle>
          <Button variant="outline-light" size="sm" onClick={resetCreateState}>
            Clear
          </Button>
        </CardHeader>
        <CardBody>
          {createMessage && (
            <Alert variant={createMessage.type} className="mb-3" dismissible onClose={() => setCreateMessage(null)}>
              {createMessage.text}
            </Alert>
          )}

          <div className="d-flex flex-wrap gap-2 mb-3">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => downloadFile(`${API_BASE_URL}/products/admin/bulk-create/template?format=csv`, setCreateMessage)}
            >
              Download Template (CSV)
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => downloadFile(`${API_BASE_URL}/products/admin/bulk-create/export?format=csv`, setCreateMessage)}
            >
              Export Current Data (CSV)
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => downloadFile(`${API_BASE_URL}/vehicles/export?format=csv`, setCreateMessage)}
            >
              Export Vehicles (CSV)
            </Button>
          </div>

          <Form onSubmit={handleCreatePreview} className="mb-4">
            <Form.Group className="mb-3">
              <Form.Label>Upload CSV or XLSX</Form.Label>
              <Form.Control
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
              />
              <Form.Text className="text-muted">
                Required headers have * mark. Include productCode* (PRO-000001), categoryCode* (CAT-000001/CATS-000001), name*, productType*, retail_mrp*.
              </Form.Text>
            </Form.Group>
            <Button type="submit" variant="primary" disabled={createLoading}>
              {createLoading ? <Spinner animation="border" size="sm" className="me-2" /> : <IconifyIcon icon="bx:show" className="me-1" />}
              Preview
            </Button>
          </Form>

          {createPreview && (
            <div className="mb-4">
              <div className="d-flex flex-wrap gap-3 mb-3">
                <Badge bg="primary">Total: {createPreview.totalRows}</Badge>
                <Badge bg="success">Valid: {createPreview.validRows}</Badge>
                <Badge bg="danger">Invalid: {createPreview.invalidRows}</Badge>
              </div>
              {createErrors.length > 0 && (
                <Alert variant="warning" className="mb-3">
                  {createErrors.length} rows are invalid. They will be skipped during processing.
                </Alert>
              )}
              <Button variant="success" onClick={handleCreateConfirm} disabled={createLoading || createPreview.validRows === 0}>
                {createLoading ? <Spinner animation="border" size="sm" className="me-2" /> : <IconifyIcon icon="bx:check-circle" className="me-1" />}
                Confirm & Queue Job
              </Button>
            </div>
          )}

          {createJob && (
            <div className="border rounded p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <div className="fw-medium">Job ID: {createJob.jobId}</div>
                  <div className="text-muted small">Status: {createJobStatus?.status || createJob.status}</div>
                </div>
                <Button variant="outline-primary" size="sm" onClick={handleCreateStatus} disabled={createStatusLoading}>
                  {createStatusLoading ? <Spinner animation="border" size="sm" /> : 'Refresh'}
                </Button>
              </div>
              {createJobStatus?.progress && (
                <div className="text-muted small">
                  Processed: {createJobStatus.progress.processed} / {createJobStatus.progress.total} | Success: {createJobStatus.progress.success} | Failed: {createJobStatus.progress.failed}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="d-flex align-items-center justify-content-between">
          <CardTitle as="h4" className="mb-0">Bulk Update (Price & Stock)</CardTitle>
          <Button variant="outline-light" size="sm" onClick={resetUpdateState}>
            Clear
          </Button>
        </CardHeader>
        <CardBody>
          {updateMessage && (
            <Alert variant={updateMessage.type} className="mb-3" dismissible onClose={() => setUpdateMessage(null)}>
              {updateMessage.text}
            </Alert>
          )}

          <div className="d-flex flex-wrap gap-2 mb-3">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => downloadFile(`${API_BASE_URL}/products/admin/bulk-update/template?format=csv`, setUpdateMessage)}
            >
              Download Template (CSV)
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => downloadFile(`${API_BASE_URL}/products/admin/bulk-update/export?format=csv`, setUpdateMessage)}
            >
              Export Current Data (CSV)
            </Button>
          </div>

          <Form onSubmit={handleUpdatePreview} className="mb-4">
            <Form.Group className="mb-3">
              <Form.Label>Upload CSV or XLSX</Form.Label>
              <Form.Control
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => setUpdateFile(e.target.files?.[0] || null)}
              />
              <Form.Text className="text-muted">
                Columns: productCode* (PRO-000001), retail_mrp*, retail_sale_price*, wholesale_mrp*, wholesale_sale_price*, stock*.
              </Form.Text>
            </Form.Group>
            <Button type="submit" variant="primary" disabled={updateLoading}>
              {updateLoading ? <Spinner animation="border" size="sm" className="me-2" /> : <IconifyIcon icon="bx:show" className="me-1" />}
              Preview
            </Button>
          </Form>

          {updatePreview && (
            <div className="mb-4">
              <div className="d-flex flex-wrap gap-3 mb-3">
                <Badge bg="primary">Total: {updatePreview.totalRows}</Badge>
                <Badge bg="success">Valid: {updatePreview.validRows}</Badge>
                <Badge bg="danger">Invalid: {updatePreview.invalidRows}</Badge>
              </div>
              {updateErrors.length > 0 && (
                <Alert variant="warning" className="mb-3">
                  {updateErrors.length} rows are invalid. They will be skipped during processing.
                </Alert>
              )}
              <Button variant="success" onClick={handleUpdateConfirm} disabled={updateLoading || updatePreview.validRows === 0}>
                {updateLoading ? <Spinner animation="border" size="sm" className="me-2" /> : <IconifyIcon icon="bx:check-circle" className="me-1" />}
                Confirm & Queue Job
              </Button>
            </div>
          )}

          {updateJob && (
            <div className="border rounded p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <div className="fw-medium">Job ID: {updateJob.jobId}</div>
                  <div className="text-muted small">Status: {updateJobStatus?.status || updateJob.status}</div>
                </div>
                <Button variant="outline-primary" size="sm" onClick={handleUpdateStatus} disabled={updateStatusLoading}>
                  {updateStatusLoading ? <Spinner animation="border" size="sm" /> : 'Refresh'}
                </Button>
              </div>
              {updateJobStatus?.progress && (
                <div className="text-muted small">
                  Processed: {updateJobStatus.progress.processed} / {updateJobStatus.progress.total} | Success: {updateJobStatus.progress.success} | Failed: {updateJobStatus.progress.failed}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  )
}

export default BulkAddPage
