'use client';
import { useEffect, useMemo, useState } from 'react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Form, Modal } from 'react-bootstrap'
import { currency } from '@/context/constants'
import Link from 'next/link'
import {
  ADMIN_STATUS_UPDATES,
  ORDER_STATUS_LIST,
  getOrderStatusLabel,
  getPaymentStatusBadge,
} from '@/constants/orderStatus'
import { getStatusBadge } from '@/helpers/orderApi'

const OrderActions = ({ order, onStatusUpdate, updatingStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState(order.orderStatus || 'created')

  useEffect(() => {
    setSelectedStatus(order.orderStatus || 'created')
  }, [order.orderStatus])

  const statusOptions = useMemo(() => {
    const current = order.orderStatus || 'created'
    const base = [...ADMIN_STATUS_UPDATES]
    if (!base.includes(current)) {
      base.unshift(current)
    }
    return ORDER_STATUS_LIST.filter((status) => base.includes(status) || status === current)
  }, [order.orderStatus])

  const canUpdate =
    selectedStatus &&
    selectedStatus !== order.orderStatus &&
    ADMIN_STATUS_UPDATES.includes(selectedStatus)

  return (
    <Card className="mb-3 border-0 shadow-sm">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <div className="d-flex align-items-center justify-content-between">
          <CardTitle as={'h5'} className="mb-0">Order Actions</CardTitle>
          {(() => {
            const badge = getStatusBadge(order.orderStatus)
            return (
              <Badge bg={badge.bg} className="text-uppercase fw-semibold">
                {badge.text}
              </Badge>
            )
          })()}
        </div>
      </CardHeader>
      <CardBody>
        <div className="mb-3">
          <Form.Label className="text-muted fs-13 mb-1">Change Status</Form.Label>
          <Form.Select
            aria-label="Order status"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status} disabled={!ADMIN_STATUS_UPDATES.includes(status)}>
                {getOrderStatusLabel(status)}
              </option>
            ))}
          </Form.Select>
          {!ADMIN_STATUS_UPDATES.includes(selectedStatus) && (
            <div className="text-muted fs-12 mt-1">Current status is shown for visibility but cannot be applied.</div>
          )}
        </div>

        <div className="d-flex justify-content-between align-items-center mt-4">
          <Button
            variant="outline-danger"
            size="sm"
            disabled={!ADMIN_STATUS_UPDATES.includes('cancelled') || order.orderStatus === 'cancelled' || updatingStatus}
            onClick={() => onStatusUpdate?.('cancelled')}
          >
            Cancel Order
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!canUpdate || updatingStatus}
            onClick={() => onStatusUpdate?.(selectedStatus)}
          >
            {updatingStatus ? 'Updating...' : 'Update'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

const SHIPMENT_STATUS_OPTIONS = ['pending', 'shipped', 'in_transit', 'delivered', 'cancelled', 'returned']

const ShipmentTracking = ({ shipments = [], items = [], onUpsertShipment, savingShipment }) => {
  const [showModal, setShowModal] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [shippingProviderId, setShippingProviderId] = useState('')
  const [carrierName, setCarrierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingUrlFormat, setTrackingUrlFormat] = useState('')
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('')
  const [status, setStatus] = useState('shipped')
  const [editingShipmentId, setEditingShipmentId] = useState(null)

  const hasShipments = shipments.length > 0

  const resetForm = () => {
    setSelectedItemId('')
    setShippingProviderId('')
    setCarrierName('')
    setTrackingNumber('')
    setTrackingUrlFormat('')
    setEstimatedDeliveryDate('')
    setStatus('shipped')
    setEditingShipmentId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (shipment) => {
    setSelectedItemId(shipment.orderItemId)
    setShippingProviderId(shipment.shippingProviderId || '')
    setCarrierName(shipment.carrierName || '')
    setTrackingNumber(shipment.trackingNumber || '')
    setTrackingUrlFormat(shipment.trackingUrlFormat || '')
    setEstimatedDeliveryDate(
      shipment.estimatedDeliveryDate ? new Date(shipment.estimatedDeliveryDate).toISOString().slice(0, 10) : ''
    )
    setStatus(shipment.status || 'shipped')
    setEditingShipmentId(shipment._id)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!selectedItemId) return
    const payload = {
      shippingProviderId: shippingProviderId || undefined,
      carrierName: carrierName || undefined,
      trackingNumber: trackingNumber || undefined,
      trackingUrlFormat: trackingUrlFormat || undefined,
      estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toISOString() : undefined,
      status: status && status !== 'pending' ? status : undefined,
    }

    const hasExisting = shipments.some((shipment) => shipment.orderItemId === selectedItemId)
    const success = await onUpsertShipment?.(selectedItemId, payload, hasExisting)
    if (success) {
      setShowModal(false)
      resetForm()
    }
  }

  const itemLabel = (item) => {
    const name = item.productId?.name || 'Product'
    return name
  }

  const itemLabelById = useMemo(() => {
    const map = new Map()
    items.forEach((item) => {
      map.set(item._id, itemLabel(item))
    })
    return map
  }, [items])

  return (
    <Card className="mb-3 border-0 shadow-sm">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <div className="d-flex justify-content-between align-items-center">
          <CardTitle as={'h5'} className="mb-0">Shipment Tracking</CardTitle>
          <Button variant="dark" size="sm" onClick={openCreateModal}>
            Add Tracking
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {hasShipments ? (
          <div className="vstack gap-2">
            {shipments.map((shipment) => {
              const trackingUrl = shipment.trackingUrlFormat
                ? shipment.trackingUrlFormat.replace('{{trackingNumber}}', shipment.trackingNumber || '')
                : shipment.trackingUrl
              return (
                <div key={shipment._id} className="bg-light p-3 rounded">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                    <div>
                      <div className="fs-12 text-muted mb-1">
                        Item: {itemLabelById.get(shipment.orderItemId) || 'Order item'}
                      </div>
                      <div className="fw-medium text-primary mb-1 text-wrap text-break">
                        {shipment.carrierName || 'Carrier'} -{' '}
                        {trackingUrl ? (
                          <a href={trackingUrl} target="_blank" rel="noreferrer" className="text-decoration-underline">
                            {shipment.trackingNumber || 'Tracking number'}
                          </a>
                        ) : (
                          <span className="text-decoration-underline">{shipment.trackingNumber || 'Tracking number'}</span>
                        )}
                      </div>
                      <div className="fs-12 text-muted mb-0">
                        Status: <span className="text-capitalize">{shipment.status || 'pending'}</span>
                      </div>
                      {shipment.estimatedDeliveryDate && (
                        <div className="fs-12 text-muted">
                          ETA: {new Date(shipment.estimatedDeliveryDate).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </div>
                    <Button variant="outline-primary" size="sm" onClick={() => openEditModal(shipment)}>
                      Edit
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-muted text-center fs-13 mb-3">No shipments have been created for this order.</p>
        )}
      </CardBody>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingShipmentId ? 'Edit Tracking' : 'Add Tracking'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Order Item</Form.Label>
            <Form.Select value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}>
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item._id} value={item._id}>
                  {itemLabel(item)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Shipping Provider ID</Form.Label>
            <Form.Control
              value={shippingProviderId}
              onChange={(event) => setShippingProviderId(event.target.value)}
              placeholder="Enter provider ID"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Carrier Name</Form.Label>
            <Form.Control value={carrierName} onChange={(event) => setCarrierName(event.target.value)} placeholder="DHL, Blue Dart..." />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Tracking Number</Form.Label>
            <Form.Control value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="AWB / tracking number" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Tracking URL Format</Form.Label>
            <Form.Control
              value={trackingUrlFormat}
              onChange={(event) => setTrackingUrlFormat(event.target.value)}
              placeholder="https://carrier.com/track/{{trackingNumber}}"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Estimated Delivery Date</Form.Label>
            <Form.Control
              type="date"
              value={estimatedDeliveryDate}
              onChange={(event) => setEstimatedDeliveryDate(event.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Status</Form.Label>
            <Form.Select value={status} onChange={(event) => setStatus(event.target.value)}>
              {SHIPMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replace(/_/g, ' ')}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!selectedItemId || savingShipment}
          >
            {savingShipment ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  )
}

const OrderAttribution = ({ order }) => {
  return (
    <Card className="mb-3 border-0 shadow-sm">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <CardTitle as={'h5'} className="mb-0">Order Attribution</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="mb-3">
          <span className="text-muted d-block fs-12 mb-1">Origin</span>
          <span className="fw-medium">{order.origin || 'Direct'}</span>
        </div>
        <div className="mb-3">
          <span className="text-muted d-block fs-12 mb-1">Device Type</span>
          <span className="fw-medium">{order.deviceType || 'Desktop (Unknown)'}</span>
        </div>
        <div className="mb-0">
          <span className="text-muted d-block fs-12 mb-1">IP Address</span>
          <span className="fw-medium font-monospace">{order.ipAddress || '127.0.0.1'}</span>
        </div>
      </CardBody>
    </Card>
  )
}
export const OrderNotes = ({ notes = [], onAddNote, addingNote }) => {
  const [noteContent, setNoteContent] = useState('')
  const [noteType, setNoteType] = useState('private')

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [notes])

  const handleSubmit = async () => {
    if (!noteContent.trim()) return
    const success = await onAddNote?.({ noteType, noteContent: noteContent.trim() })
    if (success) {
      setNoteContent('')
      setNoteType('private')
    }
  }

  const noteVariant = (type) => {
    if (type === 'customer') return 'warning'
    if (type === 'system') return 'secondary'
    return 'primary'
  }

  return (
    <Card className="border-0 shadow-sm h-100">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <div className="d-flex justify-content-between align-items-center">
          <CardTitle as={'h5'} className="mb-0">Order Notes</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <div className="notes-list mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {sortedNotes.length === 0 && (
            <p className="text-muted text-center fs-13">No notes yet.</p>
          )}
          {sortedNotes.map((note) => (
            <div key={note._id || note.createdAt} className={`note-item border-start border-3 border-${noteVariant(note.noteType)} ps-3 mb-3`}>
              <p className="text-muted fs-13 mb-1">{note.noteContent || 'Note added.'}</p>
              <small className="text-muted opacity-75">
                {note.noteType ? `${note.noteType.charAt(0).toUpperCase()}${note.noteType.slice(1)} note` : 'Note'}{' '}
                {note.createdAt ? `- ${new Date(note.createdAt).toLocaleString()}` : ''}
              </small>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <Form.Label className="fs-13 text-muted">Add Note</Form.Label>
          <Form.Select className="mb-2" value={noteType} onChange={(event) => setNoteType(event.target.value)}>
            <option value="private">Internal Note</option>
            <option value="customer">Customer Visible</option>
            <option value="system">System Note</option>
          </Form.Select>
          <Form.Control
            as="textarea"
            rows={3}
            className="mb-2"
            placeholder="Write a note for this order..."
            value={noteContent}
            onChange={(event) => setNoteContent(event.target.value)}
          />
          <div className="d-flex justify-content-end">
            <Button variant="light" size="sm" className="border" disabled={addingNote || !noteContent.trim()} onClick={handleSubmit}>
              {addingNote ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}


const CustomerDetails = ({ user, order }) => {
  if (!user) return null;
  return (
    <Card className="mb-3 border-0 shadow-sm">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <CardTitle as={'h5'} className="mb-0">Customer Details</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className="avatar bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold fs-18" style={{ width: 48, height: 48 }}>
            {user.firstName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="mb-1 fw-bold text-dark">{user.firstName} {user.lastName}</p>
            <Link href={`mailto:${user.email}`} className="text-muted fs-13 text-decoration-none">
              {user.email}
            </Link>
          </div>
        </div>
        <div className="vstack gap-2">
          <div className="d-flex align-items-center gap-2 text-muted">
            <IconifyIcon icon="solar:phone-calling-broken" className="fs-16" />
            <span>{user.phone || 'N/A'}</span>
          </div>
          <div className="d-flex align-items-center gap-2 text-muted">
            <IconifyIcon icon="solar:user-broken" className="fs-16" />
            <span>{user.customerType || 'Retail'} Customer</span>
          </div>
        </div>

        {order.customerStats && (
          <div className="row g-2 mt-3 pt-3 border-top border-dashed">
            <div className="col-4 text-center">
              <div className="h6 mb-0">{order.customerStats.totalOrders ?? 'N/A'}</div>
              <small className="text-muted fs-11">Orders</small>
            </div>
            <div className="col-4 text-center border-start border-end">
              <div className="h6 mb-0">
                {order.customerStats.totalSpent != null ? `${currency}${order.customerStats.totalSpent}` : 'N/A'}
              </div>
              <small className="text-muted fs-11">Spent</small>
            </div>
            <div className="col-4 text-center">
              <div className="h6 mb-0">
                {order.customerStats.avgOrderValue != null ? `${currency}${order.customerStats.avgOrderValue}` : 'N/A'}
              </div>
              <small className="text-muted fs-11">AOV</small>
            </div>
          </div>
        )}

        <div className="mt-4">
          <Link href={`/customer/customer-detail?id=${user._id}`} className="btn btn-outline-primary btn-sm w-100">
            View Profile
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}

export const PaymentInformation = ({ order, onPaymentUpdate, updatingPayment }) => {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    const remaining = order.paymentSummary?.remainingAmount
    setAmount(remaining != null ? remaining : '')
  }, [order.paymentSummary?.remainingAmount])

  const isCOD = (order.paymentMethod || '').toLowerCase() === 'cod'
  const paymentUpdates = Array.isArray(order.codPayments)
    ? [...order.codPayments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : []
  const numericAmount = Number(amount)
  const canSubmit = Number.isFinite(numericAmount) && numericAmount > 0 && !updatingPayment

  const handleSubmit = async () => {
    if (!onPaymentUpdate) return
    const payload = {
      amount: amount === '' ? undefined : Number(amount),
      note: note.trim(),
    }
    const success = await onPaymentUpdate(payload)
    if (success) {
      setNote('')
    }
  }

  return (
    <Card className="mb-3 border-0 shadow-sm h-100">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <CardTitle as={'h5'} className="mb-0">Payment Info</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <span className="text-muted">Payment Method</span>
          <span className="fw-medium text-dark text-capitalize">{order.paymentMethod || 'Online'}</span>
        </div>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <span className="text-muted">Payment Status</span>
          <Badge bg={getPaymentStatusBadge(order.paymentStatus).bg} className="text-capitalize">
            {getPaymentStatusBadge(order.paymentStatus).text}
          </Badge>
        </div>
        {order.paymentSummary && (
          <div className="d-flex flex-wrap gap-2 text-muted fs-12 mb-3">
            <span>Total: {currency}{Number(order.paymentSummary.totalAmount || 0).toFixed(2)}</span>
            <span>Paid: {currency}{Number(order.paymentSummary.paidAmount || 0).toFixed(2)}</span>
            <span>Remaining: {currency}{Number(order.paymentSummary.remainingAmount || 0).toFixed(2)}</span>
          </div>
        )}
        {isCOD && (
          <div className="mt-3 pt-3 border-top">
            <Form.Label className="text-muted fs-13 mb-2">Update COD Payment</Form.Label>
            <Form.Group className="mb-2">
              <Form.Label className="fs-12 text-muted">Amount Received</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fs-12 text-muted">Note</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Payment received by cash, any remark..."
              />
            </Form.Group>
            <Button variant="primary" size="sm" disabled={!canSubmit} onClick={handleSubmit}>
              {updatingPayment ? 'Saving...' : 'Update Payment'}
            </Button>

            {paymentUpdates.length > 0 && (
              <div className="mt-4">
                <div className="text-muted fs-12 mb-2">Payment Updates</div>
                <div className="vstack gap-2">
                  {paymentUpdates.map((entry, idx) => (
                    <div key={`${entry.createdAt || idx}`} className="bg-light p-2 rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-capitalize fw-medium">{entry.status}</span>
                        <small className="text-muted">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}
                        </small>
                      </div>
                      <div className="fs-13 text-muted">
                        Amount: {currency}{Number(entry.amount || 0).toFixed(2)}
                      </div>
                      {entry.note && (
                        <div className="fs-12 text-muted mt-1">{entry.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {order.transactionId && (
          <div className="d-flex align-items-center justify-content-between">
            <span className="text-muted">Transaction ID</span>
            <span className="font-monospace fs-13">{order.transactionId}</span>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

const Documents = ({ onDownloadInvoice, invoiceDisabled }) => {
  return (
    <Card className="mb-3 border-0 shadow-sm">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <CardTitle as={'h5'} className="mb-0">Documents</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="vstack gap-2">
          <Button
            variant="light"
            className="w-100 d-flex align-items-center justify-content-between gap-2 text-dark bg-white border"
            onClick={onDownloadInvoice}
            disabled={invoiceDisabled}
          >
            <span className="d-flex align-items-center gap-2"> <IconifyIcon icon="solar:file-text-broken" /> Invoice</span>
            <IconifyIcon icon="solar:download-minimalistic-broken" />
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

const OrderDetails = ({ order, shipments, items, notes, onStatusUpdate, updatingStatus, onAddNote, addingNote, onDownloadInvoice, onUpsertShipment, savingShipment }) => {
  if (!order) return null;
  return (
    <div>
      <OrderActions order={order} onStatusUpdate={onStatusUpdate} updatingStatus={updatingStatus} />
      <ShipmentTracking shipments={shipments} items={items} onUpsertShipment={onUpsertShipment} savingShipment={savingShipment} />
      <Documents onDownloadInvoice={onDownloadInvoice} invoiceDisabled={order.paymentStatus !== 'paid'} />
      <CustomerDetails user={order.userId} order={order} />
      <OrderNotes notes={notes} onAddNote={onAddNote} addingNote={addingNote} />
    </div>
  )
}
export default OrderDetails
