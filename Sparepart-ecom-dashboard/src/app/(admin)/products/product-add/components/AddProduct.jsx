'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'
import React from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row, Alert, Spinner, Form, Placeholder, Button } from 'react-bootstrap'
import { toast } from 'react-toastify'
import productService from '@/services/productService'
import VehicleCompatibilitySection from './VehicleCompatibilitySection'
import { reviewAPI } from '@/helpers/reviewApi'
import { API_BASE_URL, API_ORIGIN } from '@/helpers/apiBase'
import MediaPickerModal from '@/components/media/MediaPickerModal'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_IMAGE_COUNT = 5

const AddProduct = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')
  const isEditMode = Boolean(productId)

  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [manufacturerBrands, setManufacturerBrands] = useState([])
  const [taxOptions, setTaxOptions] = useState([])

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [loadingSubcategories, setLoadingSubcategories] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    shortDescription: '',
    longDescription: '',
    productType: 'AFTERMARKET',
    manufacturerBrand: '',
    vehicleBrand: '',
    sku: '',
    hsnCode: '',
    oemNumber: '',
    taxClassKey: '',
    taxRate: '',
    stockQty: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    minOrderQty: 1,
    minWholesaleQty: '',
    retailPrice: {
      mrp: '',
      salePrice: ''
    },
    wholesalePrice: {
      mrp: '',
      salePrice: ''
    },
    status: 'active'
  })

  const [loading, setLoading] = useState(isEditMode)
  const [submitting, setSubmitting] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [featuredImageId, setFeaturedImageId] = useState(null)
  const [featuredNewIndex, setFeaturedNewIndex] = useState(0)
  const [existingImages, setExistingImages] = useState([])
  const [imagesToDelete, setImagesToDelete] = useState([])
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [compatibilityVehicleIds, setCompatibilityVehicleIds] = useState([])
  const [vehicleBrands, setVehicleBrands] = useState([])
  const [loadingVehicleBrands, setLoadingVehicleBrands] = useState(false)
  const [productReviews, setProductReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState(null)

  const reviewStatusLabel = {
    published: 'Approved',
    hidden: 'Disapproved',
    spam: 'Spam'
  }

  const reviewStatusVariant = {
    published: 'success',
    hidden: 'secondary',
    spam: 'danger'
  }

  const formatReviewUser = (review) => {
    const user = review?.userId || review?.user || null
    if (!user) return 'Anonymous'
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
    return fullName || user.email || 'Anonymous'
  }

  useEffect(() => {
    if (isEditMode && productId && session?.accessToken) {
      fetchProductData()
    }
  }, [isEditMode, productId, session])

  useEffect(() => {
    const fetchProductReviews = async () => {
      if (!isEditMode || !productId || !session?.accessToken) return

      try {
        setReviewsLoading(true)
        setReviewsError(null)
        const response = await reviewAPI.list({ productId }, session.accessToken)
        const list = response?.data || []
        setProductReviews(Array.isArray(list) ? list : [])
      } catch (err) {
        console.error('Error fetching product reviews:', err)
        setReviewsError(err?.message || 'Failed to load reviews')
      } finally {
        setReviewsLoading(false)
      }
    }

    fetchProductReviews()
  }, [isEditMode, productId, session])

  const fetchProductData = async () => {
    try {
      setLoading(true)
      const token = session?.accessToken

      const response = await fetch(`${API_BASE_URL}/products/admin/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch product')
      }

      const data = await response.json()
      const product = data.data

      setFormData({
        name: product.name || '',
        shortDescription: product.shortDescription || '',
        longDescription: product.longDescription || '',
        productType: product.productType || product.type || 'AFTERMARKET',
        manufacturerBrand: product.manufacturerBrand || product.brand || '',
        vehicleBrand: product.vehicleBrand || '',
        sku: product.sku || '',
        hsnCode: product.hsnCode || '',
        oemNumber: product.oemNumber || product.oemPartNumber || '',
        taxClassKey: product.taxClassKey || '',
        taxRate: product.taxRate !== undefined && product.taxRate !== null ? String(product.taxRate) : '',
        stockQty: product.stockQty !== undefined && product.stockQty !== null ? String(product.stockQty) : '',
        weight: product.weight !== undefined && product.weight !== null ? String(product.weight) : '',
        length: product.length !== undefined && product.length !== null ? String(product.length) : '',
        width: product.width !== undefined && product.width !== null ? String(product.width) : '',
        height: product.height !== undefined && product.height !== null ? String(product.height) : '',
        minOrderQty: product.minOrderQty || 1,
        minWholesaleQty: product.minWholesaleQty || '',
        retailPrice: {
          mrp: product.retailPrice?.mrp || '',
          salePrice: product.retailPrice?.salePrice || ''
        },
        wholesalePrice: {
          mrp: product.wholesalePrice?.mrp || '',
          salePrice: product.wholesalePrice?.salePrice || ''
        },
        status: product.status || 'active'
      })

      const categoryMeta = product.categoryMeta || {}
      if (product.categoryId) {
        const categoryId = product.categoryId._id || product.categoryId

        if (categoryMeta.parentId) {
          const parentId = categoryMeta.parentId
          setSelectedCategory(parentId)
          setSelectedSubcategory(categoryId)

          try {
            const subResponse = await fetch(`${API_BASE_URL}/categories/children/${parentId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            if (subResponse.ok) {
              const subData = await subResponse.json()
              setSubcategories(subData.data || [])
            }
          } catch (subErr) {
            console.error('Error fetching subcategories:', subErr)
          }
        } else {
          setSelectedCategory(categoryId)
        }
      }

      try {
        const imgResponse = await fetch(`${API_BASE_URL}/product-images?productId=${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (imgResponse.ok) {
          const imgData = await imgResponse.json()
          const images = imgData.data || []
          setExistingImages(images)
          const primary = images.find((img) => img.isPrimary)
          setFeaturedImageId(primary?._id || images[0]?._id || null)
        }
      } catch (imgErr) {
        console.error('Error fetching images:', imgErr)
      }

      try {
        const compatResponse = await fetch(`${API_BASE_URL}/product-compatibility/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (compatResponse.ok) {
          const compatData = await compatResponse.json()
          const ids = compatData?.data?.vehicleIds || []
          setCompatibilityVehicleIds(Array.isArray(ids) ? ids : [])
        }
      } catch (compatErr) {
        console.error('Error fetching compatibility:', compatErr)
      }
    } catch (err) {
      console.error('Error fetching product:', err)
      setError(err.message || 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchCategories = async () => {
      const token = session?.accessToken
      if (!token) return

      try {
        setLoadingCategories(true)
        const response = await fetch(`${API_BASE_URL}/categories/roots`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setCategories(data.data || [])
        }
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setLoadingCategories(false)
      }
    }

    const fetchLookups = async () => {
      const token = session?.accessToken
      if (!token) return

      try {
        const headers = { Authorization: `Bearer ${token}` }
        setLoadingVehicleBrands(true)
        const [manufacturerRes, taxRes, vehicleBrandRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/brands?type=manufacturer`, { headers }),
          fetch(`${API_BASE_URL}/settings?group=tax`, { headers }),
          fetch(`${API_BASE_URL}/vehicle-brands?status=active&limit=200`, { headers })
        ])

        if (manufacturerRes.status === 'fulfilled' && manufacturerRes.value.ok) {
          const data = await manufacturerRes.value.json()
          const list = data?.data?.brands || data?.data || data?.brands || []
          setManufacturerBrands(Array.isArray(list) ? list : [])
        }

        if (taxRes.status === 'fulfilled' && taxRes.value.ok) {
          const data = await taxRes.value.json()
          const settings = data?.data || data
          const classes = Array.isArray(settings?.tax_classes) ? settings.tax_classes : []
          const options = classes
            .filter((item) => item?.key || item?.name)
            .map((item) => ({
              label: item.name || item.key,
              value: item.key || item.name,
              ratePercent: item.ratePercent ?? '',
            }))
          if (!options.length) {
            const taxRate = settings?.tax_rate
            if (taxRate !== undefined && taxRate !== null) {
              options.push({ label: `${taxRate}% GST`, value: String(taxRate), ratePercent: taxRate })
            }
          }
          setTaxOptions(options)
        }

        if (vehicleBrandRes.status === 'fulfilled' && vehicleBrandRes.value.ok) {
          const data = await vehicleBrandRes.value.json()
          const list = data?.data?.items || data?.data || data?.items || data?.brands || []
          setVehicleBrands(Array.isArray(list) ? list : [])
        }
      } catch (err) {
        console.error('Error fetching lookups:', err)
      } finally {
        setLoadingVehicleBrands(false)
      }
    }

    if (session) {
      fetchCategories()
      fetchLookups()
    }
  }, [session])

  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!selectedCategory) {
        setSubcategories([])
        setSelectedSubcategory('')
        return
      }

      const token = session?.accessToken
      if (!token) return

      try {
        setLoadingSubcategories(true)
        const response = await fetch(`${API_BASE_URL}/categories/children/${selectedCategory}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setSubcategories(data.data || [])
        }
      } catch (err) {
        console.error('Error fetching subcategories:', err)
      } finally {
        setLoadingSubcategories(false)
      }
    }

    fetchSubcategories()
  }, [selectedCategory, session])

  useEffect(() => {
    if (selectedImages.length === 0) {
      setFeaturedNewIndex(0)
    } else if (featuredNewIndex >= selectedImages.length) {
      setFeaturedNewIndex(0)
    }
  }, [selectedImages, featuredNewIndex])

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value)
    setSelectedSubcategory('')
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (name.startsWith('retailPrice.') || name.startsWith('wholesalePrice.')) {
      const [priceType, field] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [priceType]: {
          ...prev[priceType],
          [field]: value
        }
      }))
      return
    }

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
      return
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProductTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      productType: value,
      manufacturerBrand: value === 'AFTERMARKET' ? prev.manufacturerBrand : '',
      vehicleBrand: value === 'OEM' ? prev.vehicleBrand : '',
      oemNumber: value === 'OEM' ? prev.oemNumber : ''
    }))
  }

  const handleTaxClassChange = (e) => {
    const selectedKey = e.target.value
    const selected = taxOptions.find((option) => option.value === selectedKey)
    setFormData(prev => ({
      ...prev,
      taxClassKey: selectedKey,
      taxRate: selected ? String(selected.ratePercent ?? '') : '',
    }))
  }

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const parseNumber = (value) => (value === '' || value === null || value === undefined ? undefined : Number(value))

  const getImageSrc = (url) => {
    if (!url) return ''
    return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
  }

  const handleImageSelection = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const tooLarge = files.filter((file) => file.size > MAX_IMAGE_BYTES)
    if (tooLarge.length) {
      const message = `${tooLarge.length} file(s) exceed the 5 MB limit.`
      setError(message)
      toast.error(message)
    }

    const validFiles = files.filter((file) => file.size <= MAX_IMAGE_BYTES)
    const existingCount = existingImages.length + selectedImages.length
    const availableSlots = MAX_IMAGE_COUNT - existingCount

    if (availableSlots <= 0) {
      const message = `You can upload up to ${MAX_IMAGE_COUNT} images.`
      setError(message)
      toast.error(message)
      event.target.value = ''
      return
    }

    let accepted = validFiles
    if (validFiles.length > availableSlots) {
      const message = `You can upload only ${availableSlots} more image(s).`
      setError(message)
      toast.error(message)
      accepted = validFiles.slice(0, availableSlots)
    }

    if (accepted.length) {
      setSelectedImages(prev => [...prev, ...accepted])
    }

    event.target.value = ''
  }

  const saveCompatibility = async (targetId, token) => {
    const response = await fetch(`${API_BASE_URL}/product-compatibility/${targetId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vehicleIds: compatibilityVehicleIds })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data?.message || 'Failed to save vehicle compatibility')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formData.name) {
      setError('Product name is required')
      return
    }

    if (!selectedCategory && !selectedSubcategory) {
      setError('Please select a category')
      return
    }

    if (!formData.retailPrice.mrp) {
      setError('Retail price (MRP) is required')
      return
    }

    if (!formData.productType) {
      setError('Product type is required')
      return
    }

    if (formData.productType === 'OEM') {
      if (!formData.vehicleBrand?.trim()) {
        setError('Vehicle brand is required for OEM products')
        return
      }
      if (!formData.oemNumber?.trim()) {
        setError('OEM number is required for OEM products')
        return
      }
    }

    if (formData.productType === 'AFTERMARKET' && !formData.manufacturerBrand?.trim()) {
      setError('Manufacturer brand is required for Aftermarket products')
      return
    }

    const token = session?.accessToken
    if (!token) {
      setError(isEditMode ? 'You must be logged in to update products' : 'You must be logged in to create products')
      return
    }

    try {
      setSubmitting(true)

      const productData = {
        name: formData.name,
        categoryId: selectedSubcategory || selectedCategory,
        retailPrice: {
          mrp: parseFloat(formData.retailPrice.mrp),
          salePrice: formData.retailPrice.salePrice ? parseFloat(formData.retailPrice.salePrice) : undefined
        },
        productType: formData.productType,
        manufacturerBrand: formData.productType === 'AFTERMARKET' ? formData.manufacturerBrand || undefined : undefined,
        vehicleBrand: formData.productType === 'OEM' ? formData.vehicleBrand || undefined : undefined,
        sku: formData.sku || undefined,
        hsnCode: formData.hsnCode || undefined,
        oemNumber: formData.productType === 'OEM' ? formData.oemNumber || undefined : undefined,
        shortDescription: formData.shortDescription || undefined,
        longDescription: formData.longDescription || undefined,
        minOrderQty: parseInt(formData.minOrderQty, 10) || 1,
        minWholesaleQty: formData.minWholesaleQty ? parseInt(formData.minWholesaleQty, 10) : undefined,
        stockQty: formData.stockQty === '' ? 0 : parseInt(formData.stockQty, 10) || 0,
        weight: parseNumber(formData.weight),
        length: parseNumber(formData.length),
        width: parseNumber(formData.width),
        height: parseNumber(formData.height),
        taxClassKey: formData.taxClassKey || undefined,
        taxRate: parseNumber(formData.taxRate),
        status: formData.status
      }

      if (!isEditMode) {
        productData.slug = generateSlug(formData.name)
      }

      if (featuredImageId) {
        productData.primaryImageId = featuredImageId
      }

      if (formData.wholesalePrice.mrp) {
        productData.wholesalePrice = {
          mrp: parseFloat(formData.wholesalePrice.mrp),
          salePrice: formData.wholesalePrice.salePrice ? parseFloat(formData.wholesalePrice.salePrice) : undefined
        }
      }

      const response = isEditMode
        ? await productService.updateProduct(productId, productData, token)
        : await productService.createProduct(productData, token)

      const targetId = isEditMode ? productId : response.data._id
      await saveCompatibility(targetId, token)

      if (imagesToDelete.length > 0) {
        try {
          for (const imageId of imagesToDelete) {
            await fetch(`${API_BASE_URL}/product-images/${imageId}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`
              }
            })
          }
        } catch (imgErr) {
          console.error('Error deleting images:', imgErr)
        }
      }

      if (selectedImages.length > 0) {
        try {
          const formDataUpload = new FormData()
          selectedImages.forEach(file => {
            formDataUpload.append('images', file)
          })

          const targetId = isEditMode ? productId : response.data._id

          const uploadResponse = await fetch(`${API_BASE_URL}/products/${targetId}/images`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: formDataUpload
          })
          if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.json().catch(() => ({}))
            throw new Error(uploadError.message || 'Failed to upload images')
          }

          try {
            const refreshed = await fetch(`${API_BASE_URL}/product-images?productId=${targetId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (refreshed.ok) {
              const imgData = await refreshed.json()
              const images = imgData.data || []
              setExistingImages(images)
              const primary = images.find((img) => img.isPrimary)
              setFeaturedImageId(primary?._id || images[0]?._id || null)
              setSelectedImages([])
            }
          } catch (refreshError) {
            console.error('Error refreshing images:', refreshError)
          }
        } catch (imgError) {
          console.error('Error uploading images:', imgError)
          const message = imgError?.message || 'Failed to upload images'
          setError(message)
          toast.error(message)
        }
      }

      setSuccess(isEditMode ? 'Product updated successfully!' : 'Product created successfully!')

      setTimeout(() => {
        router.push('/products/product-list')
      }, 2000)

      if (!isEditMode) {
        setFormData({
          name: '',
          shortDescription: '',
          longDescription: '',
          productType: 'AFTERMARKET',
          manufacturerBrand: '',
          vehicleBrand: '',
          sku: '',
          hsnCode: '',
          oemNumber: '',
          taxClassKey: '',
          taxRate: '',
          stockQty: '',
          weight: '',
          length: '',
          width: '',
          height: '',
          minOrderQty: 1,
          minWholesaleQty: '',
          retailPrice: { mrp: '', salePrice: '' },
          wholesalePrice: { mrp: '', salePrice: '' },
          status: 'active'
        })
        setSelectedCategory('')
        setSelectedSubcategory('')
        setSelectedImages([])
        setExistingImages([])
        setImagesToDelete([])
        setFeaturedImageId(null)
        setCompatibilityVehicleIds([])
      }
    } catch (err) {
      console.error('Error saving product:', err)
      setError(err.message || 'Failed to save product. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Row className="g-3">
        <Col xl={8} lg={12}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <Placeholder as={CardTitle} xs={4} />
            </CardHeader>
            <CardBody className="placeholder-glow">
              <Row className="g-3">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <Col lg={3} md={6} key={`field-skeleton-${idx}`}>
                    <Placeholder xs={8} className="mb-2" />
                    <Placeholder xs={12} style={{ height: 38, borderRadius: 12 }} />
                  </Col>
                ))}
                <Col lg={12}>
                  <Placeholder xs={6} className="mb-2" />
                  <Placeholder xs={12} style={{ height: 90, borderRadius: 12 }} />
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
        <Col xl={4} lg={12}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <Placeholder as={CardTitle} xs={5} />
            </CardHeader>
            <CardBody className="placeholder-glow">
              <Placeholder className="w-100 mb-3" style={{ height: 220, borderRadius: 16 }} />
              <Placeholder xs={6} className="mb-2" />
              <Placeholder xs={12} style={{ height: 38, borderRadius: 12 }} />
              <div className="mt-3">
                <Placeholder.Button xs={12} size="sm" className="mb-2" />
                <Placeholder.Button xs={12} size="sm" />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    )
  }

  const addMediaImages = async (items) => {
    if (!items?.length) return
    const existingCount = existingImages.length + selectedImages.length
    const availableSlots = MAX_IMAGE_COUNT - existingCount
    if (availableSlots <= 0) {
      toast.error(`You can upload up to ${MAX_IMAGE_COUNT} images.`)
      return
    }

    const limited = items.slice(0, availableSlots)
    try {
      const files = await Promise.all(
        limited.map(async (item) => {
          const url = getImageSrc(item.url)
          const response = await fetch(url)
          const blob = await response.blob()
          const ext = blob.type?.split('/')?.[1] || 'jpg'
          const filename = item.key || `media-${item._id}.${ext}`
          return new File([blob], filename, { type: blob.type || 'image/jpeg' })
        })
      )

      const validFiles = files.filter((file) => file.size <= MAX_IMAGE_BYTES)
      if (validFiles.length < files.length) {
        toast.error('Some images exceed the size limit and were skipped.')
      }

      setSelectedImages((prev) => [...prev, ...validFiles])
    } catch (error) {
      console.error('Failed to add media images:', error)
      toast.error('Failed to add images from media library.')
    }
  }

  const featuredExistingImage = featuredImageId
    ? existingImages.find((img) => img._id === featuredImageId)
    : null
  const featuredNewImage = selectedImages[featuredNewIndex]

  return (
    <Col xl={12} lg={12} className="product-editor">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Row className="g-4">
          <Col xl={8} lg={12}>
            <Card className="product-editor-card mb-3">
              <CardBody>
                <label className="form-label fw-semibold">Product title</label>
                <input
                  type="text"
                  name="name"
                  className="form-control product-field"
                  placeholder="Product title"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </CardBody>
            </Card>

            <Card className="product-editor-card mb-3">
              <CardBody>
                <label className="form-label fw-semibold">Short Description</label>
                <textarea
                  className="form-control product-field product-field-textarea"
                  name="shortDescription"
                  placeholder="Short description"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                />
              </CardBody>
            </Card>

            <Card className="product-editor-card mb-3">
              <CardBody>
                <label className="form-label fw-semibold">Long Description</label>
                <textarea
                  className="form-control product-field product-field-textarea"
                  name="longDescription"
                  placeholder="Long description"
                  value={formData.longDescription}
                  onChange={handleInputChange}
                />
              </CardBody>
            </Card>

            <Card className="product-editor-card">
              <CardHeader className="border-0 pb-0">
                <div className="d-flex align-items-center justify-content-between">
                  <CardTitle as={'h4'} className="mb-0 product-editor-title">Product Data</CardTitle>
                  <div className="btn-group btn-group-sm" role="group" aria-label="Product type">
                    <button
                      type="button"
                      className={`btn ${formData.productType === 'OEM' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => handleProductTypeChange('OEM')}
                    >
                      OEM
                    </button>
                    <button
                      type="button"
                      className={`btn ${formData.productType === 'AFTERMARKET' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => handleProductTypeChange('AFTERMARKET')}
                    >
                      Aftermarket
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <Row className="g-3">
                  <Col lg={3} md={6}>
                    <label className="form-label">Category</label>
                    <select
                      className="form-select product-field"
                      value={selectedCategory}
                      onChange={handleCategoryChange}
                      disabled={loadingCategories}
                      required
                    >
                      <option value="">
                        {loadingCategories ? 'Loading categories...' : 'Choose a category'}
                      </option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">Sub Category</label>
                    <select
                      className="form-select product-field"
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
                      disabled={!selectedCategory || loadingSubcategories}
                    >
                      <option value="">
                        {!selectedCategory
                          ? 'Select a category first'
                          : loadingSubcategories
                            ? 'Loading subcategories...'
                            : subcategories.length === 0
                              ? 'No subcategories available'
                              : 'Choose a subcategory'}
                      </option>
                      {subcategories.map((subcat) => (
                        <option key={subcat._id} value={subcat._id}>
                          {subcat.name}
                        </option>
                      ))}
                    </select>
                  </Col>
                  {formData.productType === 'AFTERMARKET' && (
                    <Col lg={3} md={6}>
                      <label className="form-label">Manufacturer Brand</label>
                      <select
                        className="form-select product-field"
                        name="manufacturerBrand"
                        value={formData.manufacturerBrand}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select manufacturer</option>
                        {manufacturerBrands.map((brand) => (
                          <option key={brand._id} value={brand.name}>
                            {brand.name}
                          </option>
                        ))}
                      </select>
                    </Col>
                  )}
                  <Col lg={3} md={6}>
                    <label className="form-label">SKU</label>
                    <input
                      type="text"
                      name="sku"
                      className="form-control product-field"
                      placeholder="SKU"
                      value={formData.sku}
                      onChange={handleInputChange}
                    />
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">HSN</label>
                    <input
                      type="text"
                      name="hsnCode"
                      className="form-control product-field"
                      placeholder="HSN"
                      value={formData.hsnCode}
                      onChange={handleInputChange}
                    />
                  </Col>
                  {formData.productType === 'OEM' && (
                    <>
                      <Col lg={3} md={6}>
                        <label className="form-label">Vehicle Brand</label>
                        <select
                          className="form-select product-field"
                          name="vehicleBrand"
                          value={formData.vehicleBrand}
                          onChange={handleInputChange}
                          disabled={loadingVehicleBrands}
                          required
                        >
                          <option value="">
                            {loadingVehicleBrands ? 'Loading vehicle brands...' : 'Select vehicle brand'}
                          </option>
                          {vehicleBrands.map((brand) => (
                            <option key={brand._id} value={brand.name}>
                              {brand.name}
                            </option>
                          ))}
                        </select>
                      </Col>
                      <Col lg={3} md={6}>
                        <label className="form-label">OEM Number</label>
                        <input
                          type="text"
                          name="oemNumber"
                          className="form-control product-field"
                          placeholder="OEM Number"
                          value={formData.oemNumber}
                          onChange={handleInputChange}
                          required
                        />
                      </Col>
                    </>
                  )}

                  <Col lg={3} md={6}>
                    <label className="form-label">Select Tax</label>
                    <select
                      className="form-select product-field"
                      value={formData.taxClassKey}
                      onChange={handleTaxClassChange}
                    >
                      <option value="">No tax</option>
                      {taxOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.ratePercent ? `${option.label} (${option.ratePercent}%)` : option.label}
                        </option>
                      ))}
                    </select>
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">Quantity (Stock)</label>
                    <input
                      type="number"
                      name="stockQty"
                      className="form-control product-field"
                      placeholder="0"
                      min="0"
                      value={formData.stockQty}
                      onChange={handleInputChange}
                    />
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">Weight (kg)</label>
                    <input
                      type="number"
                      name="weight"
                      className="form-control product-field"
                      placeholder="0.0"
                      min="0"
                      step="0.01"
                      value={formData.weight}
                      onChange={handleInputChange}
                    />
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">Length</label>
                    <input
                      type="number"
                      name="length"
                      className="form-control product-field"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      value={formData.length}
                      onChange={handleInputChange}
                    />
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">Width</label>
                    <input
                      type="number"
                      name="width"
                      className="form-control product-field"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      value={formData.width}
                      onChange={handleInputChange}
                    />
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">Height</label>
                    <input
                      type="number"
                      name="height"
                      className="form-control product-field"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      value={formData.height}
                      onChange={handleInputChange}
                    />
                  </Col>

                  <Col lg={3} md={6}>
                    <label className="form-label">Retail MRP</label>
                    <input
                      type="number"
                      name="retailPrice.mrp"
                      className="form-control product-field"
                      placeholder="0.00"
                      value={formData.retailPrice.mrp}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      min="0"
                    />
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">Retail Sale Price</label>
                    <input
                      type="number"
                      name="retailPrice.salePrice"
                      className="form-control product-field"
                      placeholder="0.00"
                      value={formData.retailPrice.salePrice}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                    />
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">Minimum Order Quantity (Retail)</label>
                    <input
                      type="number"
                      name="minOrderQty"
                      className="form-control product-field"
                      placeholder="1"
                      min="1"
                      value={formData.minOrderQty}
                      onChange={handleInputChange}
                    />
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">Minimum Order Quantity (Wholesale)</label>
                    <input
                      type="number"
                      name="minWholesaleQty"
                      className="form-control product-field"
                      placeholder="1"
                      min="1"
                      value={formData.minWholesaleQty}
                      onChange={handleInputChange}
                    />
                  </Col>

                  <Col lg={3} md={6}>
                    <label className="form-label">Wholesale MRP</label>
                    <input
                      type="number"
                      name="wholesalePrice.mrp"
                      className="form-control product-field"
                      placeholder="0.00"
                      value={formData.wholesalePrice.mrp}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                    />
                  </Col>
                  <Col lg={3} md={6}>
                    <label className="form-label">Wholesale Sale Price</label>
                    <input
                      type="number"
                      name="wholesalePrice.salePrice"
                      className="form-control product-field"
                      placeholder="0.00"
                      value={formData.wholesalePrice.salePrice}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                    />
                  </Col>

                </Row>
              </CardBody>
            </Card>

            <VehicleCompatibilitySection
              token={session?.accessToken}
              value={compatibilityVehicleIds}
              onChange={setCompatibilityVehicleIds}
            />
          </Col>

          <Col xl={4} lg={12}>
            <div className="product-image-panel bg-white mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Featured Image</h5>
                <div className="d-flex gap-2">
                  <label className="btn btn-sm btn-outline-primary mb-0">
                    <IconifyIcon icon="solar:upload-bold" className="me-1" />
                    Upload
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageSelection}
                    />
                  </label>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setShowMediaPicker(true)}
                  >
                    Choose from Media Library
                  </Button>
                </div>
              </div>

              <div className="product-image-drop mb-3">
                {featuredExistingImage ? (
                  <img
                    src={getImageSrc(featuredExistingImage.url)}
                    alt="Featured"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }}
                  />
                ) : featuredNewImage ? (
                  <img
                    src={URL.createObjectURL(featuredNewImage)}
                    alt="Featured"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }}
                  />
                ) : (
                  <div>
                    <IconifyIcon icon="solar:gallery-broken" className="fs-48 mb-2" />
                    <div className="fw-semibold">Featured Image</div>
                    <div className="small">Upload or drop to add</div>
                  </div>
                )}
              </div>

              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small">Gallery images</span>
                <span className="text-muted small">{existingImages.length + selectedImages.length}/5</span>
              </div>

              <div className="d-flex flex-wrap gap-2">
                {existingImages.length === 0 && selectedImages.length === 0 && (
                  <div className="text-muted small">No gallery images yet</div>
                )}

                {existingImages.map((image) => (
                  <div
                    key={image._id}
                    className={`product-image-thumb ${featuredImageId === image._id ? 'active' : ''}`}
                    onClick={() => {
                      setFeaturedImageId(image._id)
                      setFeaturedNewIndex(0)
                    }}
                  >
                    <img src={getImageSrc(image.url)} alt={image.altText || 'Product'} />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 p-0"
                      style={{ width: 20, height: 20, borderRadius: '50%' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setImagesToDelete(prev => [...prev, image._id])
                        setExistingImages(prev => prev.filter((img) => img._id !== image._id))
                        if (featuredImageId === image._id) {
                          const remaining = existingImages.filter((img) => img._id !== image._id)
                          setFeaturedImageId(remaining[0]?._id || null)
                        }
                      }}
                    >
                      <IconifyIcon icon="solar:close-circle-bold" className="fs-12" />
                    </button>
                  </div>
                ))}

                {selectedImages.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className={`product-image-thumb ${!featuredImageId && featuredNewIndex === index ? 'active' : ''}`}
                    onClick={() => {
                      setFeaturedImageId(null)
                      setFeaturedNewIndex(index)
                    }}
                  >
                    <img src={URL.createObjectURL(file)} alt={file.name} />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 p-0"
                      style={{ width: 20, height: 20, borderRadius: '50%' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedImages(prev => prev.filter((_, i) => i !== index))
                      }}
                    >
                      <IconifyIcon icon="solar:close-circle-bold" className="fs-12" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-light rounded">
              <Row className="justify-content-end g-2">
                <Col lg={6} md={4}>
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      isEditMode ? 'Update' : 'Create'
                    )}
                  </button>
                </Col>
                <Col lg={6} md={4}>
                  <Link href="/products/product-list" className="btn btn-outline-secondary w-100">
                    Cancel
                  </Link>
                </Col>
      </Row>
      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        multiple
        usedIn="product"
        onSelect={(items) => addMediaImages(items)}
      />
            </div>

            {isEditMode && (
              <Card className="mt-4">
                <CardHeader className="d-flex align-items-center justify-content-between">
                  <CardTitle as="h5" className="mb-0">Product Reviews</CardTitle>
                  <span className="text-muted small">
                    {productReviews.length} total
                  </span>
                </CardHeader>
                <CardBody>
                  {reviewsLoading && (
                    <div className="text-center py-3">
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}

                  {!reviewsLoading && reviewsError && (
                    <Alert variant="light" className="mb-3 text-center">{reviewsError}</Alert>
                  )}

                  {!reviewsLoading && !reviewsError && productReviews.length === 0 && (
                    <Alert variant="light" className="mb-0 text-center">No reviews yet for this product.</Alert>
                  )}

                  {!reviewsLoading && !reviewsError && productReviews.map((review) => (
                    <div key={review._id || review.id} className="border rounded-3 p-3 mb-3">
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div>
                          <div className="fw-semibold text-dark">{review.title || 'Review'}</div>
                          <div className="text-muted small">By {formatReviewUser(review)}</div>
                        </div>
                        <span className={`badge bg-${reviewStatusVariant[review.status] || 'secondary'}`}>
                          {reviewStatusLabel[review.status] || review.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <ul className="d-flex m-0 fs-16 list-unstyled">
                          {Array.from({ length: 5 }).map((_star, idx) => (
                            <li
                              className={idx < Math.round(review.rating || 0) ? 'text-warning' : 'text-muted'}
                              key={idx}
                            >
                              <IconifyIcon icon="bxs:star" />
                            </li>
                          ))}
                        </ul>
                        <span className="text-muted small">{Number(review.rating || 0).toFixed(1)}/5</span>
                      </div>
                      <p className="text-muted small mt-2 mb-0">
                        {review.comment || 'No review message provided.'}
                      </p>
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}
          </Col>
        </Row>
      </form>
    </Col>
  )
}

export default AddProduct
