'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Alert, Button, Card, CardFooter, CardTitle, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { inventoryAPI } from '@/helpers/inventoryApi'
import { API_BASE_URL } from '@/helpers/apiBase'
import DataTable from '@/components/shared/DataTable'

const WarehouseList = ({ filters = {}, onInventoryChange }) => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [adjustType, setAdjustType] = useState('increase')
  const [adjustQty, setAdjustQty] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    if (!session?.accessToken) return
    fetchProducts()
  }, [session, page, filters])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await inventoryAPI.listProducts(session.accessToken, { page, limit: 20, ...filters })
      const payload = response.data || response
      setProducts(payload.items || [])
      setTotalPages(payload.totalPages || 1)
      onInventoryChange?.()
    } catch (err) {
      setError(err.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setAdjustType('increase')
    setAdjustQty('')
    setNote('')
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingItem(null)
    setAdjustType('increase')
    setAdjustQty('')
    setNote('')
  }

  const nextStock = useMemo(() => {
    if (!editingItem) return 0
    const current = Number(editingItem.stockQty ?? 0)
    const qty = Number(adjustQty || 0)
    const delta = adjustType === 'decrease' ? -qty : qty
    return Math.max(0, current + delta)
  }, [editingItem, adjustQty, adjustType])

  const handleSaveAdjust = async () => {
    if (!editingItem || !session?.accessToken) return
    const qty = Number(adjustQty)
    if (!qty || qty <= 0) {
      alert('Please enter a quantity greater than 0')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/inventory/adjust`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: editingItem._id,
          type: adjustType,
          quantity: qty,
          note,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.message || 'Failed to update stock')
      }

      closeEditModal()
      fetchProducts()
    } catch (err) {
      alert(err?.message || 'Failed to update stock')
    }
  }

  return (
    <Row>
      <Col xl={12}>
        <Card>
          <div className="d-flex card-header justify-content-between align-items-center">
            <div>
              <CardTitle as={'h4'}>Inventory Products</CardTitle>
            </div>
          </div>

          <div>
            {error && <Alert variant="danger" className="m-3">{error}</Alert>}
            <DataTable
              columns={[
                { key: 'checkbox', label: '', width: 20, render: (item) => (
                  <Form.Check id={`product-${item._id}`} />
                )},
                { key: 'productId', label: 'Product ID', render: (item) => 
                  String(item.productId || item._id || '').replace(/\D/g, '').slice(-10) || '-'
                },
                { key: 'name', label: 'Product', render: (item) => item.name || item.productName },
                { key: 'sku', label: 'SKU', render: (item) => item.sku || '-' },
                { key: 'stockQty', label: 'Stock', render: (item) => item.stockQty ?? 0 },
                { key: 'reservedQty', label: 'Reserved', render: (item) => item.reservedQty ?? 0 },
                { key: 'availableQty', label: 'Available', render: (item) => item.availableQty ?? 0 },
                { key: 'actions', label: 'Action', render: (item) => (
                  <Button
                    size="sm"
                    variant="link"
                    className="p-0 text-primary"
                    onClick={() => openEditModal(item)}
                    title="Edit stock"
                  >
                    <IconifyIcon icon="solar:pen-new-square-bold-duotone" width={18} height={18} />
                  </Button>
                )}
              ]}
              data={products}
              loading={loading}
              emptyMessage="No inventory data found"
            />
          </div>
          {!loading && totalPages > 1 && (
            <CardFooter className="border-top">
              <nav aria-label="Page navigation example">
                <ul className="pagination justify-content-end mb-0">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                      Previous
                    </button>
                  </li>
                  <li className="page-item active">
                    <span className="page-link">{page}</span>
                  </li>
                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </CardFooter>
          )}
        </Card>
      </Col>

      <Modal show={showEditModal} onHide={closeEditModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Stock</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <div className="fw-semibold">{editingItem?.name || editingItem?.productName || 'Product'}</div>
            <div className="text-muted small">Current stock: {editingItem?.stockQty ?? 0}</div>
          </div>
          <Form.Group className="mb-3">
            <Form.Label>Adjustment Type</Form.Label>
            <Form.Select value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Quantity</Form.Label>
            <Form.Control
              type="number"
              min="1"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="Enter quantity"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Note (optional)</Form.Label>
            <Form.Control
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for this adjustment"
            />
          </Form.Group>
          <div className="text-muted small">New stock: {Number.isFinite(nextStock) ? nextStock : 0}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeEditModal}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveAdjust}>Save</Button>
        </Modal.Footer>
      </Modal>
    </Row>
  )
}

export default WarehouseList
