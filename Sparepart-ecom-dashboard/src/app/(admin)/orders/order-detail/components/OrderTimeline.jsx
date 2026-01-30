import React from 'react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
import { getOrderStatusLabel } from '@/constants/orderStatus'

const getEventLabel = (event) => {
  if (!event) return 'Order updated'
  if (event.type === 'NOTE_ADDED') return 'Note added'
  if (event.type === 'FRAUD_FLAG') return 'Fraud flag updated'
  if (event.newStatus && event.previousStatus && event.newStatus !== event.previousStatus) {
    return `Status updated to ${getOrderStatusLabel(event.newStatus)}`
  }
  return event.type?.replace(/_/g, ' ')?.toLowerCase() || 'Order updated'
}

const getEventDescription = (event) => {
  if (!event) return ''
  if (event.noteContent) return event.noteContent
  if (event.newStatus && event.previousStatus && event.newStatus !== event.previousStatus) {
    return `Status changed from ${getOrderStatusLabel(event.previousStatus)} to ${getOrderStatusLabel(event.newStatus)}.`
  }
  return event.meta?.message || ''
}

const OrderTimeline = ({ events = [] }) => {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle as={'h4'}>Order Timeline</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="position-relative ms-2">
          <span className="position-absolute start-0  top-0 border border-dashed h-100" />
          {sortedEvents.length === 0 && (
            <div className="text-muted ps-4">No activity recorded for this order yet.</div>
          )}
          {sortedEvents.map((event, idx) => (
            <div className="position-relative ps-4" key={idx}>
              <div className="mb-4">
                {idx === 0 ? (
                  <span className="position-absolute start-0 avatar-sm translate-middle-x bg-light d-inline-flex align-items-center justify-content-center rounded-circle">
                    <span className="order-timeline-spinner" role="status" aria-label="Loading" />
                  </span>
                ) : (
                  <span className="position-absolute start-0 avatar-sm translate-middle-x bg-light d-inline-flex align-items-center justify-content-center rounded-circle text-success fs-20">
                    <IconifyIcon icon="bx:check-circle" />
                  </span>
                )}
                <div className="ms-2 d-flex flex-wrap gap-2 align-items-center justify-content-between">
                  <div>
                    <h5 className="mb-1 text-dark fw-medium fs-15 text-capitalize">{getEventLabel(event)}</h5>
                    {getEventDescription(event) && <p className="mb-2">{getEventDescription(event)}</p>}
                  </div>
                  <p className="mb-0">
                    {event.createdAt ? new Date(event.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: '2-digit',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
export default OrderTimeline
