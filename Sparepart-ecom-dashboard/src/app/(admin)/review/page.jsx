'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import PageTItle from '@/components/PageTItle'
import { getAllReviews } from '@/helpers/data'
import { reviewAPI } from '@/helpers/reviewApi'
import { getRatingStatus } from '@/utils/other'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardBody, Col, Row, Spinner, Placeholder } from 'react-bootstrap'
import { toast } from 'react-toastify'

const STATUS_LABELS = {
  published: 'Approved',
  hidden: 'Disapproved',
  spam: 'Spam'
}

const STATUS_VARIANTS = {
  published: 'success',
  hidden: 'secondary',
  spam: 'danger'
}

const formatUserName = (user) => {
  if (!user) return 'Anonymous'
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  return fullName || user.email || 'Anonymous'
}

const ReviewCard = ({ review, onUpdateStatus, onDelete }) => {
  const rating = Number(review?.rating || 0)
  const user = review?.userId || review?.user || null
  const product = review?.productId || null
  const createdAt = review?.createdAt ? new Date(review.createdAt) : null
  const status = review?.status || 'published'

  return (
    <Card className="h-100 border-0 shadow-sm review-card">
      <CardBody className="p-4">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className={`badge bg-${STATUS_VARIANTS[status] || 'secondary'} text-uppercase`}>
                {STATUS_LABELS[status] || status}
              </span>
              {createdAt && (
                <span className="text-muted small">{createdAt.toLocaleDateString()}</span>
              )}
            </div>
            <h5 className="mb-1 text-dark fw-semibold">
              {review?.title || 'Review'}
            </h5>
            {product && (
              <div className="text-muted small">
                Product:{' '}
                <Link href={`/products/product-add?id=${product?._id || product?.id}`} className="text-decoration-none">
                  {product?.name || 'View Product'}
                </Link>
              </div>
            )}
          </div>
          <div className="text-end">
            <div className="d-flex align-items-center gap-1 justify-content-end">
              <ul className="d-flex m-0 fs-18 list-unstyled">
                {Array.from({ length: 5 }).map((_star, idx) => (
                  <li
                    className={idx < Math.round(rating) ? 'text-warning' : 'text-muted'}
                    key={idx}
                  >
                    <IconifyIcon icon="bxs:star" />
                  </li>
                ))}
              </ul>
              <span className="fw-semibold text-dark">{rating.toFixed(1)}/5</span>
            </div>
            <div className="text-muted small">{getRatingStatus(rating)} Quality</div>
          </div>
        </div>

        <div className="bg-light rounded-3 p-3 mb-3">
          <div className="text-uppercase text-muted fw-semibold small mb-1">Your Review</div>
          <p className="mb-0 text-dark">
            {review?.comment || 'No review message provided.'}
          </p>
        </div>

        <Row className="g-3 mb-3">
          <Col md={6}>
            <div className="border rounded-3 p-3 h-100">
              <div className="text-uppercase text-muted fw-semibold small mb-2">Customer Details</div>
              <div className="fw-semibold text-dark">{formatUserName(user)}</div>
              <div className="text-muted small">{user?.email || 'No email provided'}</div>
              <div className="text-muted small">{user?.phone || 'No phone provided'}</div>
            </div>
          </Col>
        </Row>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-success"
            disabled={status === 'published'}
            onClick={() => onUpdateStatus(review, 'published')}
          >
            Approve
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={status === 'hidden'}
            onClick={() => onUpdateStatus(review, 'hidden')}
          >
            Disapprove
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            disabled={status === 'spam'}
            onClick={() => onUpdateStatus(review, 'spam')}
          >
            Mark Spam
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-auto"
            onClick={() => onDelete(review)}
          >
            Delete
          </button>
        </div>
      </CardBody>
    </Card>
  )
}

const ReviewPage = () => {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    const fetchReviews = async () => {
      if (session?.accessToken) {
        try {
          const data = await getAllReviews(session.accessToken)
          setReviews(Array.isArray(data) ? data : [])
        } catch (e) {
          console.error(e)
          toast.error('Failed to load reviews')
        } finally {
          setLoading(false)
        }
      }
    }
    fetchReviews()
  }, [session])

  const filteredReviews = useMemo(() => {
    if (statusFilter === 'all') return reviews
    return reviews.filter((item) => item.status === statusFilter)
  }, [reviews, statusFilter])

  const stats = useMemo(() => {
    const total = reviews.length
    const published = reviews.filter((item) => item.status === 'published').length
    const hidden = reviews.filter((item) => item.status === 'hidden').length
    const spam = reviews.filter((item) => item.status === 'spam').length
    return { total, published, hidden, spam }
  }, [reviews])

  const handleUpdateStatus = async (review, status) => {
    if (!review?._id || !session?.accessToken) return
    try {
      setActionId(review._id)
      await reviewAPI.update(review._id, { status }, session.accessToken)
      setReviews(prev =>
        prev.map((item) => (item._id === review._id ? { ...item, status } : item))
      )
      toast.success(`Review marked as ${STATUS_LABELS[status] || status}`)
    } catch (err) {
      console.error(err)
      toast.error(err?.message || 'Failed to update review')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (review) => {
    if (!review?._id || !session?.accessToken) return
    const confirmed = window.confirm('Delete this review permanently?')
    if (!confirmed) return

    try {
      setActionId(review._id)
      await reviewAPI.delete(review._id, session.accessToken)
      setReviews(prev => prev.filter((item) => item._id !== review._id))
      toast.success('Review deleted')
    } catch (err) {
      console.error(err)
      toast.error(err?.message || 'Failed to delete review')
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <>
        <PageTItle title="REVIEWS" />
        <div className="mb-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div className="placeholder-glow w-50">
              <Placeholder xs={4} className="mb-2" />
              <Placeholder xs={8} />
            </div>
            <div className="d-flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Placeholder.Button key={`filter-skeleton-${idx}`} xs={3} size="sm" />
              ))}
            </div>
          </div>
        </div>

        <Row className="g-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Col xl={6} key={`review-skeleton-${idx}`}>
              <Card className="h-100 border-0 shadow-sm review-card">
                <CardBody className="p-4 placeholder-glow">
                  <Placeholder xs={5} className="mb-2" />
                  <Placeholder xs={7} className="mb-3" />
                  <Placeholder xs={12} className="mb-2" />
                  <Placeholder xs={10} className="mb-3" />
                  <Placeholder xs={6} />
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
      </>
    )
  }

  return (
    <>
      <PageTItle title="REVIEWS" />
      <div className="mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div>
            <h4 className="mb-1">Customer Reviews</h4>
            <p className="text-muted mb-0">Moderate, approve, or flag customer feedback in one place.</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {[
              { key: 'all', label: `All (${stats.total})` },
              { key: 'published', label: `Approved (${stats.published})` },
              { key: 'hidden', label: `Disapproved (${stats.hidden})` },
              { key: 'spam', label: `Spam (${stats.spam})` }
            ].map((item) => (
              <button
                type="button"
                key={item.key}
                className={`btn btn-sm ${statusFilter === item.key ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setStatusFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Row className="g-4">
        {filteredReviews.map((review) => (
          <Col xl={6} key={review._id || review.id}>
            <div className={actionId === (review._id || review.id) ? 'opacity-75' : undefined}>
              <ReviewCard review={review} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} />
            </div>
          </Col>
        ))}
        {filteredReviews.length === 0 && (
          <Col xs={12}>
            <div className="alert alert-light text-center">No reviews found.</div>
          </Col>
        )}
      </Row>
    </>
  )
}
export default ReviewPage
