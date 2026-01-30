'use client'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardBody, CardHeader, Row, Col, Spinner, Alert, Form } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { API_BASE_URL } from '@/helpers/apiBase'

const sortByName = (items = []) => [...items].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))

const VehicleCompatibilitySection = ({ token, value = [], onChange }) => {
  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [years, setYears] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [selectedVehicles, setSelectedVehicles] = useState(new Map())

  const [filters, setFilters] = useState({ brandId: '', modelId: '', yearId: '' })
  const [loading, setLoading] = useState({
    brands: false,
    models: false,
    years: false,
    vehicles: false,
    selected: false,
  })
  const [error, setError] = useState(null)

  const selectedIds = useMemo(() => new Set(value.map((id) => String(id))), [value])

  useEffect(() => {
    if (!token) return
    const fetchBrands = async () => {
      setLoading((prev) => ({ ...prev, brands: true }))
      try {
        const response = await fetch(`${API_BASE_URL}/vehicle-brands?status=active&limit=200`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Failed to load vehicle brands')
        const data = await response.json()
        const list = data?.data?.items || data?.data || []
        setBrands(sortByName(Array.isArray(list) ? list : []))
      } catch (err) {
        setError(err.message || 'Failed to load vehicle brands')
      } finally {
        setLoading((prev) => ({ ...prev, brands: false }))
      }
    }
    fetchBrands()
  }, [token])

  useEffect(() => {
    if (!token || !filters.brandId) {
      setModels([])
      setFilters((prev) => ({ ...prev, modelId: '', yearId: '' }))
      return
    }
    const fetchModels = async () => {
      setLoading((prev) => ({ ...prev, models: true }))
      try {
        const response = await fetch(`${API_BASE_URL}/vehicle-models?brandId=${filters.brandId}&status=active&limit=200`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Failed to load vehicle models')
        const data = await response.json()
        const list = data?.data?.items || data?.data || []
        setModels(sortByName(Array.isArray(list) ? list : []))
      } catch (err) {
        setError(err.message || 'Failed to load vehicle models')
      } finally {
        setLoading((prev) => ({ ...prev, models: false }))
      }
    }
    fetchModels()
  }, [filters.brandId, token])

  useEffect(() => {
    if (!token || !filters.modelId) {
      setYears([])
      setFilters((prev) => ({ ...prev, yearId: '' }))
      return
    }
    const fetchYears = async () => {
      setLoading((prev) => ({ ...prev, years: true }))
      try {
        const response = await fetch(`${API_BASE_URL}/vehicles/filters/years?modelId=${filters.modelId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Failed to load vehicle years')
        const data = await response.json()
        const list = data?.data || []
        const sorted = Array.isArray(list)
          ? list.sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
          : []
        setYears(sorted)
      } catch (err) {
        setError(err.message || 'Failed to load vehicle years')
      } finally {
        setLoading((prev) => ({ ...prev, years: false }))
      }
    }
    fetchYears()
  }, [filters.modelId, token])

  useEffect(() => {
    if (!token || !filters.brandId || !filters.modelId || !filters.yearId) {
      setVehicles([])
      return
    }
    const fetchVehicles = async () => {
      setLoading((prev) => ({ ...prev, vehicles: true }))
      try {
        const query = new URLSearchParams({
          brandId: filters.brandId,
          modelId: filters.modelId,
          yearId: filters.yearId,
          limit: '200',
        })
        const response = await fetch(`${API_BASE_URL}/vehicles?${query.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Failed to load vehicle variants')
        const data = await response.json()
        const list = data?.data?.items || data?.data || []
        setVehicles(Array.isArray(list) ? list : [])
      } catch (err) {
        setError(err.message || 'Failed to load vehicle variants')
      } finally {
        setLoading((prev) => ({ ...prev, vehicles: false }))
      }
    }
    fetchVehicles()
  }, [filters.brandId, filters.modelId, filters.yearId, token])

  useEffect(() => {
    if (!token || !value.length) return
    const missing = value.filter((id) => !selectedVehicles.has(String(id)))
    if (!missing.length) return
    const fetchSelected = async () => {
      setLoading((prev) => ({ ...prev, selected: true }))
      try {
        const results = await Promise.allSettled(
          missing.map((id) =>
            fetch(`${API_BASE_URL}/vehicles/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then((res) => (res.ok ? res.json() : null))
          )
        )
        const next = new Map(selectedVehicles)
        results.forEach((result) => {
          if (result.status !== 'fulfilled') return
          const data = result.value?.data
          if (!data?._id) return
          next.set(String(data._id), data)
        })
        setSelectedVehicles(next)
      } finally {
        setLoading((prev) => ({ ...prev, selected: false }))
      }
    }
    fetchSelected()
  }, [token, value, selectedVehicles])

  const toggleVehicle = (vehicle) => {
    const id = String(vehicle._id)
    const next = new Set(value.map((item) => String(item)))
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange(Array.from(next))
    setSelectedVehicles((prev) => {
      const updated = new Map(prev)
      if (next.has(id)) updated.set(id, vehicle)
      else updated.delete(id)
      return updated
    })
  }

  const removeSelected = (id) => {
    const next = value.filter((item) => String(item) !== String(id))
    onChange(next)
    setSelectedVehicles((prev) => {
      const updated = new Map(prev)
      updated.delete(String(id))
      return updated
    })
  }

  const selectedList = Array.from(selectedVehicles.values()).filter((vehicle) =>
    selectedIds.has(String(vehicle._id))
  )

  return (
    <Card className="mt-3">
      <CardHeader className="d-flex align-items-center justify-content-between">
        <h5 className="mb-0">Vehicle Compatibility</h5>
        {loading.selected && <Spinner size="sm" />}
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="warning" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Row className="g-3 align-items-end">
          <Col lg={4} md={6}>
            <label className="form-label">Brand</label>
            <select
              className="form-select product-field"
              value={filters.brandId}
              onChange={(e) => setFilters({ brandId: e.target.value, modelId: '', yearId: '' })}
              disabled={loading.brands}
            >
              <option value="">Select brand</option>
              {brands.map((brand) => (
                <option key={brand._id} value={brand._id}>{brand.name}</option>
              ))}
            </select>
          </Col>
          <Col lg={4} md={6}>
            <label className="form-label">Model</label>
            <select
              className="form-select product-field"
              value={filters.modelId}
              onChange={(e) => setFilters((prev) => ({ ...prev, modelId: e.target.value, yearId: '' }))}
              disabled={!filters.brandId || loading.models}
            >
              <option value="">
                {!filters.brandId ? 'Select brand first' : 'Select model'}
              </option>
              {models.map((model) => (
                <option key={model._id} value={model._id}>{model.name}</option>
              ))}
            </select>
          </Col>
          <Col lg={4} md={6}>
            <label className="form-label">Year</label>
            <select
              className="form-select product-field"
              value={filters.yearId}
              onChange={(e) => setFilters((prev) => ({ ...prev, yearId: e.target.value }))}
              disabled={!filters.modelId || loading.years}
            >
              <option value="">
                {!filters.modelId ? 'Select model first' : 'Select year'}
              </option>
              {years.map((year) => (
                <option key={year._id} value={year._id}>{year.year}</option>
              ))}
            </select>
          </Col>
        </Row>

        <div className="mt-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0">Matching Variants</h6>
            {loading.vehicles && <Spinner size="sm" />}
          </div>
          {!filters.yearId ? (
            <div className="text-muted small">Select brand, model, and year to load variants.</div>
          ) : vehicles.length === 0 ? (
            <div className="text-muted small">No variants found for this selection.</div>
          ) : (
            <div className="border rounded p-2">
              {vehicles.map((vehicle) => {
                const id = String(vehicle._id)
                const checked = selectedIds.has(id)
                const attributes = Array.isArray(vehicle.attributes) ? vehicle.attributes : []
                return (
                  <div key={id} className="d-flex align-items-start gap-3 border-bottom py-2">
                    <Form.Check
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleVehicle(vehicle)}
                      className="mt-1"
                    />
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{vehicle.variantName || vehicle.display?.variantName || 'Variant'}</div>
                      <div className="text-muted small">
                        {[vehicle.display?.fuelType, vehicle.display?.transmission, vehicle.display?.engineCapacity]
                          .filter(Boolean)
                          .join(' • ')}
                      </div>
                      {attributes.length > 0 && (
                        <div className="small text-muted mt-1">
                          {attributes.map((attr) => `${attr.attributeName}: ${attr.value}`).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-4">
          <h6 className="mb-2">Selected Compatibility</h6>
          {value.length === 0 ? (
            <div className="text-muted small">No vehicles selected yet.</div>
          ) : (
            <div className="border rounded p-2">
              {selectedList.map((vehicle) => (
                <div key={vehicle._id} className="d-flex align-items-start gap-3 border-bottom py-2">
                  <div className="flex-grow-1">
                    <div className="fw-semibold">
                      {vehicle.brand?.name} {vehicle.model?.name} {vehicle.year?.year} {vehicle.variantName}
                    </div>
                    <div className="text-muted small">
                      {[vehicle.display?.fuelType, vehicle.display?.transmission, vehicle.display?.engineCapacity]
                        .filter(Boolean)
                        .join(' • ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => removeSelected(vehicle._id)}
                    title="Remove"
                  >
                    <IconifyIcon icon="solar:close-circle-broken" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

export default VehicleCompatibilitySection
