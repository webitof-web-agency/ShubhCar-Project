'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { currency } from '@/context/constants'
import productService from '@/services/productService'
import { brandsAPI } from '@/helpers/brandsApi'
import { API_BASE_URL, API_ORIGIN } from '@/helpers/apiBase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { toast } from 'react-toastify'
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  Spinner,
  Badge,
  Placeholder
} from 'react-bootstrap'


const ProductCard = ({ product, onDelete, onToggleFeatured, isSelected, onSelect }) => {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const numericId = String(product.productId || product._id || '')
    .replace(/\D/g, '')
    .slice(-10)

  const handlePermanentDelete = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm(`This will permanently delete "${product.name}". Only do this if you are absolutely sure. Continue?`)) return
    setDeleting(true)
    try {
      await onDelete(product._id, 'force-delete')
    } catch (error) {
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  const handleRestore = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    setDeleting(true)
    try {
      await onDelete(product._id, 'restore')
    } catch (error) {
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  const handlePublish = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    setDeleting(true)
    try {
      await onDelete(product._id, 'publish')
    } catch (error) {
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  const handleSoftDelete = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm(`Are you sure you want to trash "${product.name}"?`)) return

    setDeleting(true)
    try {
      await onDelete(product._id, 'delete')
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleRowClick = () => {
    router.push(`/products/product-edit?id=${product._id}`)
  }

  const stockQty = product.stock ?? product.stockQty ?? 0
  const productType = product.productType || product.type || 'AFTERMARKET'
  // Use placeholder if no image available
  const productImage = product.images?.[0]?.url

  return (
    <tr
      onClick={handleRowClick}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <td onClick={(e) => e.stopPropagation()}>
        <div className="form-check ms-1">
          <input
            type="checkbox"
            className="form-check-input"
            id={`check-${product._id}`}
            checked={isSelected}
            onChange={(e) => onSelect(product._id, e.target.checked)}
          />
          <label className="form-check-label" htmlFor={`check-${product._id}`}>
            &nbsp;
          </label>
        </div>
      </td>

      {/* Product Name, Image & Hover Actions */}
      <td>
        <div className="d-flex align-items-start gap-2">
          <div className="rounded bg-secondary-subtle avatar-md d-flex align-items-center justify-content-center flex-shrink-0">
            {productImage ? (
              <img
                src={productImage.startsWith('http') ? productImage : `${API_ORIGIN}${productImage}`}
                alt={product.name}
                width={50}
                height={50}
                className="rounded"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span className="text-muted fw-medium" style={{ fontSize: '10px' }}>Product</span>
            )}
          </div>
          <div>
            <div className="text-dark fw-medium fs-15">
              {product.name}
            </div>

            {/* Hover Actions - Always rendered but opacity controlled for layout stability */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: '13px',
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.2s',
                marginTop: '4px',
                pointerEvents: isHovered ? 'auto' : 'none'
              }}
            >
              <span className="text-muted">Code: {product.productId || '-'}</span>
              {numericId && (
                <>
                  <span className="mx-1 text-muted">|</span>
                  <span className="text-muted">ID: {numericId}</span>
                </>
              )}
              {!product.isDeleted && (
                <>
                  <span className="mx-1 text-muted">|</span>
                  <Link
                    href={`/products/product-edit?id=${product._id}`}
                    className="text-primary text-decoration-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Edit
                  </Link>

                  <span className="mx-1 text-muted">|</span>
                  <button
                    onClick={handleSoftDelete}
                    className="btn btn-link p-0 text-danger text-decoration-none border-0 align-baseline"
                    disabled={deleting}
                    style={{ fontSize: '13px' }}
                  >
                    {deleting ? 'Deleting...' : 'Trash'}
                  </button>
                  <span className="mx-1 text-muted">|</span>
                  <Link
                    href={`/products/product-edit?id=${product._id}`}
                    className="text-primary text-decoration-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </Link>
                </>
              )}
            </div>

          </div>
        </div>
      </td>

      {/* Product Code */}
      <td>
        {product.productId || '-'}
      </td>

      {/* SKU */}
      <td>
        {product.sku || 'N/A'}
      </td>

      {/* Stock Status with Quantity */}
      <td>
        <div>
          <Badge bg={stockQty > 0 ? 'success' : 'danger'} className="mb-1">
            {stockQty > 0 ? 'In Stock' : 'Out of Stock'}
          </Badge>
          <div className="small text-muted">Qty: {stockQty}</div>
        </div>
      </td>

      {/* Price (Sale/Regular) */}
      <td>
        <div className="d-flex flex-column">
          {product.retailPrice?.salePrice ? (
            <>
              <span className="text-success fw-bold">{currency}{product.retailPrice.salePrice}</span>
              <span className="text-muted text-decoration-line-through small">{currency}{product.retailPrice.mrp}</span>
            </>
          ) : (
            <span className="fw-medium">{currency}{product.retailPrice?.mrp || 0}</span>
          )}
        </div>
      </td>

      {/* Wholesale Price */}
      <td>
        <div className="d-flex flex-column">
          {product.wholesalePrice?.salePrice ? (
            <>
              <span className="text-info fw-bold">{currency}{product.wholesalePrice.salePrice}</span>
              {(product.wholesalePrice.mrp || product.wholesalePrice.price) && (
                <span className="text-muted text-decoration-line-through small">
                  {currency}{product.wholesalePrice.mrp || product.wholesalePrice.price}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted">-</span>
          )}
          {product.minWholesaleQty && (
            <small className="text-muted">Min Qty: {product.minWholesaleQty}</small>
          )}
        </div>
      </td>

      {/* Category */}
      <td>
        {product.category?.name || product.categoryId?.name || (Array.isArray(product.categories) ? product.categories.map(c => c.name).join(', ') : 'Uncategorized')}
      </td>

      {/* Identifier */}
      <td>
        {productType === 'OEM'
          ? (product.oemNumber || product.oemPartNumber || 'N/A')
          : (product.manufacturerBrand || product.brand || 'N/A')}
      </td>

      {/* Featured Toggle */}
      <td className="text-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onToggleFeatured(product)}
          className={`btn btn-sm btn-icon ${product.isFeatured ? 'text-warning' : 'text-muted'}`}
          title={product.isFeatured ? 'Remove from Featured' : 'Mark as Featured'}
        >
          {product.isFeatured ? (
            <IconifyIcon icon="solar:star-bold" className="fs-18" />
          ) : (
            <IconifyIcon icon="solar:star-linear" className="fs-18" />
          )}
        </button>
      </td>

      {/* Date Published */}
      <td>
        <div className="d-flex flex-column">
          <div className="mb-1">
            <span
              className={`badge bg-${product.isDeleted ? 'danger' : (product.status === 'active' || product.status === 'published' ? 'success' : 'warning')}-subtle text-${product.isDeleted ? 'danger' : (product.status === 'active' || product.status === 'published' ? 'success' : 'warning')} text-uppercase`}
            >
              {product.isDeleted ? 'Deleted' : (product.status || 'Draft')}
            </span>
          </div>
          <span className="fw-medium">{new Date(product.createdAt).toLocaleDateString()}</span>
          <span className="text-muted small">{new Date(product.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        </div>
      </td>

      {/* Action Column */}
      <td onClick={(e) => e.stopPropagation()}>
        <div className="d-flex gap-2">
          {product.isDeleted ? (
            <>
              <button
                onClick={handleRestore}
                className="btn btn-soft-success btn-sm"
                disabled={deleting}
                title="Restore"
              >
                {deleting ? <Spinner size="sm" /> : <IconifyIcon icon="solar:restart-broken" className="align-middle fs-18" />}
              </button>
              <button
                onClick={handlePermanentDelete}
                className="btn btn-soft-danger btn-sm"
                disabled={deleting}
                title="Delete Permanently"
              >
                {deleting ? <Spinner size="sm" /> : <IconifyIcon icon="solar:trash-bin-2-broken" className="align-middle fs-18" />}
              </button>
            </>
          ) : product.status === 'draft' ? (
            <>
              <Link
                href={`/products/product-edit?id=${product._id}`}
                className="btn btn-soft-primary btn-sm"
                title="Edit Product"
                onClick={(e) => e.stopPropagation()}
              >
                <IconifyIcon icon="solar:pen-2-broken" className="align-middle fs-18" />
              </Link>
              <button
                onClick={handlePublish}
                className="btn btn-soft-success btn-sm"
                disabled={deleting}
                title="Publish Now"
              >
                {deleting ? <Spinner size="sm" /> : <IconifyIcon icon="solar:check-circle-broken" className="align-middle fs-18" />}
              </button>
              <button
                onClick={handleSoftDelete}
                className="btn btn-soft-danger btn-sm"
                disabled={deleting}
                title="Delete Product"
              >
                {deleting ? (
                  <Spinner size="sm" />
                ) : (
                  <IconifyIcon icon="solar:trash-bin-minimalistic-2-broken" className="align-middle fs-18" />
                )}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/products/product-edit?id=${product._id}`}
                className="btn btn-soft-primary btn-sm"
                title="Edit Product"
                onClick={(e) => e.stopPropagation()}
              >
                <IconifyIcon icon="solar:pen-2-broken" className="align-middle fs-18" />
              </Link>
              <button
                onClick={handleSoftDelete}
                className="btn btn-soft-danger btn-sm"
                disabled={deleting}
                title="Delete Product"
              >
                {deleting ? (
                  <Spinner size="sm" />
                ) : (
                  <IconifyIcon icon="solar:trash-bin-minimalistic-2-broken" className="align-middle fs-18" />
                )}
              </button>
            </>
          )}
        </div>
      </td>
    </tr >
  )
}

const ProductList = () => {
  const { data: session } = useSession()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState('all')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [counts, setCounts] = useState({ all: 0, active: 0, draft: 0, trashed: 0 })
  const [categoryOptions, setCategoryOptions] = useState([])
  const [manufacturerBrands, setManufacturerBrands] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef(null)
  const [filters, setFilters] = useState({
    categoryId: '',
    manufacturerBrand: '',
    productType: '',
    stockStatus: '',
    isFeatured: ''
  })

  useEffect(() => {
    if (session?.accessToken) {
      fetchProducts()
    }
  }, [session, currentPage, itemsPerPage, activeTab, filters, searchTerm])

  useEffect(() => {
    if (session?.accessToken) {
      fetchFilters()
    }
  }, [session])

  useEffect(() => {
    const id = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [searchInput])

  const fetchFilters = async () => {
    try {
      const [categoryRes, manufacturerRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/categories/hierarchy`),
        brandsAPI.list({ type: 'manufacturer', limit: 200 })
      ])

      if (categoryRes.status === 'fulfilled' && categoryRes.value.ok) {
        const data = await categoryRes.value.json()
        const categories = data.data || data || []
        const flattened = []
        const walk = (nodes = [], prefix = '') => {
          nodes.forEach((node) => {
            const label = prefix ? `${prefix} / ${node.name}` : node.name
            flattened.push({ id: node._id, name: label })
            if (Array.isArray(node.children) && node.children.length) {
              walk(node.children, label)
            }
          })
        }
        walk(categories)
        setCategoryOptions(flattened)
      }

      if (manufacturerRes.status === 'fulfilled') {
        const data = await manufacturerRes.value
        const list = data?.data?.brands || data?.data || data?.brands || []
        setManufacturerBrands(Array.isArray(list) ? list : [])
      }
    } catch (err) {
      console.error('Failed to load filters', err)
    }
  }

  const fetchProducts = async () => {
    try {
      const isInitialLoad = products.length === 0
      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const token = session?.accessToken
      if (!token) {
        toast.error('Please log in to view products')
        return
      }

      const response = await productService.getProducts({
        page: currentPage,
        limit: itemsPerPage,
        status: activeTab,
        summary: true,
        search: searchTerm || undefined,
        categoryId: filters.categoryId || undefined,
        manufacturerBrand: filters.manufacturerBrand || undefined,
        productType: filters.productType || undefined,
        stockStatus: filters.stockStatus || undefined,
        isFeatured: filters.isFeatured || undefined
      }, token)

      // access the data payload from the API response
      const payload = response.data || {}

      const items = payload.data || []
      setProducts(items)
      setCounts(payload.counts || { all: 0, active: 0, draft: 0, trashed: 0 })
      setSelectedIds((prev) => prev.filter((id) => items.some((p) => p._id === id)))

      if (payload.totalPages) setTotalPages(payload.totalPages)
      else if (payload.total) setTotalPages(Math.ceil(payload.total / itemsPerPage))
      else setTotalPages(1)
    } catch (err) {
      console.error('Error fetching products:', err)
      toast.error(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const renderRowSkeletons = (count = itemsPerPage) =>
    Array.from({ length: count }).map((_, idx) => (
      <tr key={`product-skeleton-${idx}`} className="placeholder-glow">
        <td className="py-3">
          <Placeholder xs={1} />
      </td>
      <td>
        <div className="d-flex align-items-center gap-2">
          <div className="rounded bg-secondary-subtle avatar-md d-flex align-items-center justify-content-center flex-shrink-0">
            <Placeholder style={{ width: 40, height: 40, borderRadius: 8 }} />
          </div>
          <div className="flex-grow-1">
            <Placeholder xs={6} />
            <div className="mt-1">
              <Placeholder xs={4} />
            </div>
          </div>
        </div>
      </td>
      <td><Placeholder xs={4} /></td>
      <td><Placeholder xs={4} /></td>
      <td><Placeholder xs={6} /></td>
      <td><Placeholder xs={4} /></td>
      <td><Placeholder xs={4} /></td>
      <td><Placeholder xs={6} /></td>
      <td><Placeholder xs={4} /></td>
      <td><Placeholder xs={6} /></td>
      <td><Placeholder xs={3} /></td>
      </tr>
    ))

  const handleAction = async (productId, actionType) => {
    const token = session?.accessToken
    if (!token) return toast.error('Unauthorized')

    try {
      if (actionType === 'delete') {
        await productService.deleteProduct(productId, token)
        toast.success('Product moved to trash')
      } else if (actionType === 'force-delete') {
        await productService.permanentDeleteProduct(productId, token)
        toast.success('Product permanently deleted')
      } else if (actionType === 'restore') {
        await productService.restoreProduct(productId, token)
        toast.success('Product restored successfully')
      } else if (actionType === 'publish') {
        await productService.approveProduct(productId, token)
        toast.success('Product published successfully')
      }

      // Refresh list
      fetchProducts()
    } catch (err) {
      toast.error(err.message || 'Action failed')
    }
  }

  const handleToggleFeatured = async (product) => {
    const token = session?.accessToken
    if (!token) return toast.error('Unauthorized')

    try {
      // Optimistic update
      setProducts(prev => prev.map(p =>
        p._id === product._id ? { ...p, isFeatured: !p.isFeatured } : p
      ))

      await productService.updateProduct(product._id, { isFeatured: !product.isFeatured }, token)
      toast.success(`Product ${!product.isFeatured ? 'featured' : 'unfeatured'} successfully`)
    } catch (err) {
      toast.error(err.message || 'Failed to update featured status')
      // Revert on failure
      fetchProducts()
    }
  }

  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to empty the trash? This cannot be undone.')) return
    const token = session?.accessToken
    try {
      await productService.emptyTrash(token)
      toast.success('Trash emptied successfully')
      fetchProducts()
    } catch (err) {
      toast.error(err.message || 'Failed to empty trash')
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(products.map((p) => p._id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, id]))
      return prev.filter((item) => item !== id)
    })
  }

  const handleBulkAction = async (action) => {
    if (!action) return
    if (!selectedIds.length) {
      toast.error('Please select at least one product')
      return
    }

    const actionLabel = action === 'delete' ? 'move to trash' : action
    if (!confirm(`Are you sure you want to ${actionLabel} for ${selectedIds.length} product(s)?`)) return

    const token = session?.accessToken
    if (!token) return toast.error('Unauthorized')

    try {
      const selectedProducts = products.filter((p) => selectedIds.includes(p._id))
      const deletedIds = selectedProducts.filter((p) => p.isDeleted).map((p) => p._id)

      if (action === 'delete') {
        await Promise.all(selectedIds.map((id) => productService.deleteProduct(id, token)))
        toast.success('Selected products moved to trash')
      } else if (action === 'published') {
        if (deletedIds.length) {
          await Promise.all(deletedIds.map((id) => productService.restoreProduct(id, token)))
        }
        await Promise.all(selectedIds.map((id) => productService.approveProduct(id, token)))
        toast.success('Selected products published')
      } else if (action === 'draft') {
        if (deletedIds.length) {
          await Promise.all(deletedIds.map((id) => productService.restoreProduct(id, token)))
        }
        await Promise.all(selectedIds.map((id) => productService.updateProduct(id, { status: 'draft' }, token)))
        toast.success('Selected products moved to draft')
      }
      setSelectedIds([])
      fetchProducts()
    } catch (err) {
      toast.error(err.message || 'Bulk action failed')
    }
  }

  const isAllSelected = products.length > 0 && selectedIds.length === products.length
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < products.length

  return (
    <Card>
      <CardHeader className="d-flex align-items-center gap-3 flex-wrap">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <CardTitle as={'h4'} className="mb-0">
            All Product List{' '}
            <span className="text-muted fs-14">
              {loading ? '(--)' : `(${counts.all || 0})`}
            </span>
          </CardTitle>

          <div className="d-flex align-items-center gap-2">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'published', label: 'Published', count: counts.active },
              { id: 'draft', label: 'Draft', count: counts.draft },
              { id: 'trashed', label: 'Trashed', count: counts.trashed }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setCurrentPage(1)
                }}
                className={`btn btn-sm ${activeTab === tab.id ? 'btn-soft-primary' : 'btn-ghost-secondary text-muted'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {tab.label}{' '}
                <span className="ms-1 small">
                  {loading ? '(--)' : `(${tab.count || 0})`}
                </span>
              </button>
            ))}
          </div>
          {activeTab === 'trashed' && (
            <button onClick={handleEmptyTrash} className="btn btn-sm btn-outline-danger">
              <IconifyIcon icon="solar:trash-bin-2-bold-duotone" className="me-1" />
              Empty Trash
            </button>
          )}
        </div>

        <div className="ms-auto d-flex align-items-center gap-2">
          <div className="d-flex align-items-center" style={{ position: 'relative' }}>
            <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control no-focus-border"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  borderRight: '0',
                  boxShadow: 'none',
                  outline: 'none'
                }}
              />
              <span
                className="input-group-text bg-white border-start-0"
                style={{
                  boxShadow: 'none',
                  outline: 'none'
                }}
              >
                <IconifyIcon icon="bx:search" />
              </span>
            </div>
          </div>
          <Link href="/products/product-add" className="btn btn-sm btn-primary">
            <IconifyIcon icon="bx:plus" className="me-1" />
            Add Product
          </Link>
        </div>
      </CardHeader>
      <style jsx global>{`
        .no-focus-border:focus {
          border-color: var(--bs-border-color, #dee2e6) !important;
          box-shadow: none !important;
          outline: none !important;
        }
      `}</style>

      <div className="p-3 border-bottom">
        <div className="row g-3">
          <div className="col-lg-2 col-md-4 col-sm-6">
            <select
              className="form-select form-select-sm"
              value=""
              onChange={(e) => {
                const value = e.target.value
                if (value) handleBulkAction(value)
                e.target.value = ''
              }}
              disabled={!selectedIds.length}
            >
              <option value="">{selectedIds.length ? `Bulk Action (${selectedIds.length})` : 'Bulk Action'}</option>
              <option value="delete">Move to Trash</option>
              <option value="published">Publish</option>
              <option value="draft">Move to Draft</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-4 col-sm-6">
            <select
              className="form-select form-select-sm"
              value={filters.categoryId}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, categoryId: e.target.value }))
                setCurrentPage(1)
              }}
            >
              <option value="">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="col-lg-2 col-md-4 col-sm-6">
            <select
              className="form-select form-select-sm"
              value={filters.stockStatus}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, stockStatus: e.target.value }))
                setCurrentPage(1)
              }}
            >
              <option value="">All Stock</option>
              <option value="instock">In Stock</option>
              <option value="outstock">Out of Stock</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-4 col-sm-6">
            <select
              className="form-select form-select-sm"
              value={filters.productType}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, productType: e.target.value }))
                setCurrentPage(1)
              }}
            >
              <option value="">All Product Types</option>
              <option value="OEM">OEM</option>
              <option value="AFTERMARKET">Aftermarket</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-4 col-sm-6">
            <select
              className="form-select form-select-sm"
              value={filters.manufacturerBrand}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, manufacturerBrand: e.target.value }))
                setCurrentPage(1)
              }}
            >
              <option value="">All Manufacturer Brands</option>
              {manufacturerBrands.map((brand) => (
                <option key={brand._id} value={brand.name}>{brand.name}</option>
              ))}
            </select>
          </div>
          <div className="col-lg-2 col-md-4 col-sm-6">
            <select
              className="form-select form-select-sm"
              value={filters.isFeatured}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, isFeatured: e.target.value }))
                setCurrentPage(1)
              }}
            >
              <option value="">All Featured</option>
              <option value="true">Featured Only</option>
              <option value="false">Not Featured</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <div className="table-responsive">
          <table className="table align-middle mb-0 table-hover table-centered">
            <thead className="bg-light-subtle">
              <tr>
                <th style={{ width: 20 }}>
                  <div className="form-check ms-1">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="customCheck1"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="customCheck1" />
                  </div>
                </th>
                <th>Product</th>
                <th>Product Code</th>
                <th>SKU</th>
                <th>Stock Status</th>
                <th>Price</th>
                <th>Wholesale Price</th>
                <th>Category</th>
                <th>Identifier</th>
                <th className="text-center">Featured</th>
                <th>Date Published</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                renderRowSkeletons()
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center py-5">
                    <IconifyIcon icon="solar:box-broken" className="fs-48 text-muted mb-3" />
                    <p className="text-muted mb-0">No products found</p>
                    <Link href="/products/product-add" className="btn btn-primary btn-sm mt-3">
                      <IconifyIcon icon="bx:plus" className="me-1" />
                      Create Your First Product
                    </Link>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onDelete={handleAction}
                    onToggleFeatured={handleToggleFeatured}
                    isSelected={selectedIds.includes(product._id)}
                    onSelect={handleSelectOne}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && products.length > 0 && (
        <CardFooter className="border-top">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            {/* Total items count and per-page selector */}
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm"
                style={{ width: '70px' }}
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
              </select>
              <span className="text-muted">
                {counts[activeTab] || 0} items
              </span>
            </div>

            {/* Pagination controls */}
            <nav aria-label="Page navigation">
              <ul className="pagination justify-content-end mb-0">
                {/* First page */}
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    title="First page"
                  >
                    <IconifyIcon icon="bx:chevrons-left" />
                  </button>
                </li>

                {/* Previous page */}
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    title="Previous page"
                  >
                    <IconifyIcon icon="bx:chevron-left" />
                  </button>
                </li>

                {/* Current page info */}
                <li className="page-item disabled">
                  <span className="page-link bg-transparent border-0">
                    {currentPage} of {totalPages}
                  </span>
                </li>

                {/* Next page */}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    title="Next page"
                  >
                    <IconifyIcon icon="bx:chevron-right" />
                  </button>
                </li>

                {/* Last page */}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last page"
                  >
                    <IconifyIcon icon="bx:chevrons-right" />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

export default ProductList
