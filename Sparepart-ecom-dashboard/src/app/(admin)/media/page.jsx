'use client'
import PageTItle from '@/components/PageTItle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { mediaAPI } from '@/helpers/mediaApi'
import { API_BASE_URL, API_ORIGIN } from '@/helpers/apiBase'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, CardBody, Col, Form, Row, Spinner, Modal } from 'react-bootstrap'
import styles from './media.module.scss'


const MEDIA_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'product', label: 'Product' },
  { value: 'category', label: 'Category' },
  { value: 'page', label: 'Page' },
  { value: 'review', label: 'Review' },
  { value: 'user', label: 'User' },
  { value: 'seo', label: 'SEO' },
]

const MediaPage = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [mediaItems, setMediaItems] = useState([])
  const [usedInFilter, setUsedInFilter] = useState('all')
  const [uploadUsedIn, setUploadUsedIn] = useState('product')
  const [selectedImage, setSelectedImage] = useState(null)

  const listParams = useMemo(() => {
    if (usedInFilter === 'all') return { limit: 50, page: 1 }
    return { usedIn: usedInFilter, limit: 50, page: 1 }
  }, [usedInFilter])

  const fetchMedia = useCallback(async () => {
    if (!session?.accessToken) {
      setLoading(false)
      return
    }

    try {
      const response = await mediaAPI.list(listParams, session.accessToken)
      setMediaItems(response.data?.data || [])
    } catch (error) {
      console.error('Failed to load media', error)
    } finally {
      setLoading(false)
    }
  }, [session, listParams])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length || !session?.accessToken) return

    setUploading(true)
    try {
      await mediaAPI.upload(files, uploadUsedIn, session.accessToken)
      await fetchMedia()
    } catch (error) {
      console.error('Upload failed', error)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation() // Prevent opening preview
    if (!session?.accessToken) return
    if (!confirm('Delete this media item?')) return
    try {
      await mediaAPI.delete(id, session.accessToken)
      fetchMedia()
    } catch (error) {
      console.error('Delete failed', error)
    }
  }

  return (
    <>
      <PageTItle title="MEDIA LIBRARY" />
      <Row className="g-3">
        <Col xs={12}>
          <Card>
            <CardBody className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <h4 className="mb-1">Media Manager</h4>
                <p className="text-muted mb-0">Upload, browse, and manage store assets.</p>
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <Form.Select value={usedInFilter} onChange={(e) => setUsedInFilter(e.target.value)}>
                  {MEDIA_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </Form.Select>
                <Form.Select value={uploadUsedIn} onChange={(e) => setUploadUsedIn(e.target.value)}>
                  {MEDIA_TYPES.filter((type) => type.value !== 'all').map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </Form.Select>
                <Button variant="primary" as="label" className="mb-0" disabled={uploading}>
                  <IconifyIcon icon="solar:upload-bold-duotone" className="me-1" />
                  {uploading ? 'Uploading...' : 'Upload'}
                  <input type="file" accept="image/*" multiple hidden onChange={handleUpload} />
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <>
          <div className={styles.galleryGrid}>
            {mediaItems.map((item) => (
              <div key={item._id} className={styles.mediaCard} onClick={() => setSelectedImage(item)}>
                <div className={styles.imageContainer}>
                  <img
                    src={item.url?.startsWith('http') ? item.url : `${API_ORIGIN}${item.url}`}
                    alt={item.key}
                  />
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => handleDelete(e, item._id)}
                  title="Delete Image"
                >
                  <IconifyIcon icon="solar:close-circle-bold" />
                </button>
                <div className={styles.cardOverlay}>
                  <div className={styles.fileName} title={item.key}>{item.key}</div>
                  <div className={styles.fileType}>{(item.usedIn || []).join(', ') || 'Unassigned'}</div>
                </div>
              </div>
            ))}
          </div>

          {mediaItems.length === 0 && (
            <Card className="mt-3">
              <CardBody className="text-center text-muted py-5">
                {uploading ? 'Uploading media...' : 'No media files found.'}
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* Image Preview Modal */}
      <Modal show={!!selectedImage} onHide={() => setSelectedImage(null)} centered size="lg" contentClassName="bg-transparent border-0 shadow-none">
        <div className="position-relative text-center">
          <button
            onClick={() => setSelectedImage(null)}
            className="btn btn-dark rounded-circle position-absolute top-0 end-0 m-3 d-flex align-items-center justify-content-center"
            style={{ width: '40px', height: '40px', zIndex: 1050 }}
          >
            <IconifyIcon icon="mdi:close" className="fs-5" />
          </button>
          {selectedImage && (
            <img
              src={selectedImage.url?.startsWith('http') ? selectedImage.url : `${API_ORIGIN}${selectedImage.url}`}
              alt={selectedImage.key}
              className="img-fluid rounded shadow-lg"
              style={{ maxHeight: '90vh', objectFit: 'contain', backgroundColor: '#fff' }}
            />
          )}
        </div>
      </Modal>
    </>
  )
}

export default MediaPage
