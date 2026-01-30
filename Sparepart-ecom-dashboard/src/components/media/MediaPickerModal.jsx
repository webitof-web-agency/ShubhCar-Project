import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, Placeholder, Spinner } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { mediaAPI } from '@/helpers/mediaApi'
import { API_ORIGIN } from '@/helpers/apiBase'

const resolveMediaUrl = (url) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

const MediaPickerModal = ({
  open,
  onClose,
  onSelect,
  multiple = false,
  usedIn = 'all',
  title = 'Media Library',
}) => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [mediaItems, setMediaItems] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [previewItem, setPreviewItem] = useState(null)

  const listParams = useMemo(() => {
    if (usedIn && usedIn !== 'all') {
      return { usedIn, limit: 100, page: 1 }
    }
    return { limit: 100, page: 1 }
  }, [usedIn])

  const fetchMediaPage = async (targetPage, isInitial = false) => {
    if (!session?.accessToken) return
    if (!isInitial && (!hasMore || loadingMore)) return

    if (isInitial) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const response = await mediaAPI.list(
        { ...listParams, limit: 60, page: targetPage },
        session.accessToken
      )
      const items = response.data?.data || []

      setMediaItems((prev) => {
        const map = new Map(prev.map((item) => [item._id, item]))
        items.forEach((item) => map.set(item._id, item))
        return Array.from(map.values())
      })

      setHasMore(items.length >= 60)
      setPage(targetPage)

      if (isInitial) {
        setPreviewItem(items[0] || null)
        setSelectedIds([])
      }
    } catch (error) {
      console.error('Failed to load media', error)
      if (isInitial) setMediaItems([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (!open) return
    if (!session?.accessToken) {
      setMediaItems([])
      return
    }
    setHasMore(true)
    setPage(1)
    fetchMediaPage(1, true)
  }, [open, listParams, session])

  const toggleSelect = (item) => {
    if (multiple) {
      setSelectedIds((prev) =>
        prev.includes(item._id) ? prev.filter((id) => id !== item._id) : [...prev, item._id]
      )
    } else {
      setSelectedIds([item._id])
    }
    setPreviewItem(item)
  }

  const handleConfirm = () => {
    const selected = mediaItems.filter((item) => selectedIds.includes(item._id))
    if (selected.length && onSelect) {
      onSelect(selected)
    }
    onClose()
  }

  const isSelected = (id) => selectedIds.includes(id)

  return (
    <Modal show={open} onHide={onClose} centered size="xl">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="row g-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={`media-skeleton-${idx}`} className="col-lg-3 col-md-4 col-sm-6">
                <div className="border rounded p-2 placeholder-glow">
                  <div className="bg-light rounded mb-2" style={{ height: 120 }} />
                  <Placeholder xs={8} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="row g-3" style={{ maxHeight: '70vh' }}>
            <div className="col-lg-8">
              <div
                className="row g-3 overflow-auto pe-1"
                style={{
                  maxHeight: '70vh',
                  overflowX: 'hidden',
                  scrollBehavior: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                  scrollbarGutter: 'stable',
                }}
                onScroll={(e) => {
                  const target = e.currentTarget
                  const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 120
                  if (nearBottom) {
                    fetchMediaPage(page + 1)
                  }
                }}
              >
                {mediaItems.map((item) => (
                  <div key={item._id} className="col-lg-3 col-md-4 col-sm-6">
                    <div
                      className={`border rounded position-relative ${isSelected(item._id) ? 'border-primary' : ''}`}
                      style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}
                      onClick={() => toggleSelect(item)}
                    >
                      <img
                        src={resolveMediaUrl(item.url)}
                        alt={item.key || 'Media'}
                        className="img-fluid rounded"
                        style={{ height: 120, width: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                      {isSelected(item._id) && (
                        <span
                          className="position-absolute top-0 end-0 d-flex align-items-center justify-content-center bg-primary text-white rounded-circle"
                          style={{ width: 22, height: 22, zIndex: 2, margin: 6 }}
                        >
                          <IconifyIcon icon="mdi:check" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {!loading && mediaItems.length === 0 && (
                <div className="text-muted text-center py-5">No media files found.</div>
              )}
              {loadingMore && (
                <div className="text-center py-3 text-muted">Loading more...</div>
              )}
            </div>
            <div className="col-lg-4">
              <div className="border rounded p-3 h-100 overflow-auto" style={{ maxHeight: '70vh' }}>
                <h6 className="mb-3">Preview</h6>
                {previewItem ? (
                  <img
                    src={resolveMediaUrl(previewItem.url)}
                    alt={previewItem.key || 'Preview'}
                    className="img-fluid rounded"
                    style={{ maxHeight: 320, width: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div className="text-muted text-center py-5">Select an image to preview</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between">
        <div className="text-muted small">
          {selectedIds.length ? `${selectedIds.length} selected` : 'No image selected'}
        </div>
        <div className="d-flex gap-2">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!selectedIds.length}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Use Selected'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default MediaPickerModal
