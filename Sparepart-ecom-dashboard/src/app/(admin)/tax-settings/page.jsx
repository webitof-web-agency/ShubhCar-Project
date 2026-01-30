'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row, Button, Form, Table, Spinner, InputGroup } from 'react-bootstrap'
import { toast } from 'react-toastify'
import PageTItle from '@/components/PageTItle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { settingsAPI } from '@/helpers/settingsApi'
import { taxAPI } from '@/helpers/taxApi'
import { INDIA_COUNTRY, INDIA_STATES, normalizeIndiaStateCode } from '@/helpers/indiaRegions'

const emptyRegionRow = {
  countryCode: INDIA_COUNTRY.code,
  stateCode: '*',
  postalCode: '*',
  city: '*',
  ratePercent: '',
  name: '',
  status: 'active',
}

const emptySlabRow = {
  _id: null,
  hsnCode: '',
  ratePercent: '',
  minAmount: '',
  maxAmount: '',
  status: 'active',
}

const normalizeRegionRow = (row) => ({
  countryCode: INDIA_COUNTRY.code,
  stateCode: row.stateCode === '*' ? '*' : normalizeIndiaStateCode(row.stateCode || '*'),
  postalCode: (row.postalCode || '*').trim(),
  city: (row.city || '*').trim(),
  ratePercent: row.ratePercent === '' ? null : Number(row.ratePercent),
  name: (row.name || '').trim(),
  status: row.status || 'active',
})

const normalizeTaxClassKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const createTaxClass = (overrides = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  key: overrides.key || '',
  name: overrides.name || '',
  ratePercent: overrides.ratePercent ?? '',
  regions: overrides.regions?.length ? overrides.regions : [{ ...emptyRegionRow }],
})

const TaxSettingsPage = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [slabSaving, setSlabSaving] = useState(false)
  const [regionSearch, setRegionSearch] = useState('')
  const [selectedRegionIndexes, setSelectedRegionIndexes] = useState({})
  const [slabRows, setSlabRows] = useState([emptySlabRow])
  const [deletedSlabIds, setDeletedSlabIds] = useState([])

  const [formData, setFormData] = useState({
    tax_enabled: true,
    tax_rate: '18',
    tax_origin_state: 'KA',
    tax_price_display_shop: 'excluding',
    tax_price_display_cart: 'including',
    tax_price_display_suffix: '',
    tax_display_totals: true,
    prices_include_tax: false,
    tax_regions: [emptyRegionRow],
    tax_classes: [createTaxClass({ key: 'standard', name: 'Standard Tax Rates', ratePercent: '18' })],
  })

  useEffect(() => {
    const loadData = async () => {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }

      try {
        const [settingsResponse, slabsResponse] = await Promise.allSettled([
          settingsAPI.list(undefined, session.accessToken),
          taxAPI.listSlabs(session.accessToken),
        ])

        if (settingsResponse.status === 'fulfilled') {
          const data = settingsResponse.value.data || settingsResponse.value || {}
          const regions = Array.isArray(data.tax_regions) && data.tax_regions.length
            ? data.tax_regions.map((row) => ({
              ...emptyRegionRow,
              ...row,
              countryCode: INDIA_COUNTRY.code,
              stateCode: row.stateCode === '*' ? '*' : normalizeIndiaStateCode(row.stateCode || row.state || '*'),
            }))
            : [emptyRegionRow]
          const classes = Array.isArray(data.tax_classes) && data.tax_classes.length
            ? data.tax_classes.map((item) => createTaxClass({
              key: item.key || normalizeTaxClassKey(item.name || ''),
              name: item.name || '',
              ratePercent: item.ratePercent ?? '',
              regions: Array.isArray(item.regions) && item.regions.length
                ? item.regions.map((row) => ({
                  ...emptyRegionRow,
                  ...row,
                  countryCode: INDIA_COUNTRY.code,
                  stateCode: row.stateCode === '*' ? '*' : normalizeIndiaStateCode(row.stateCode || row.state || '*'),
                }))
                : [{ ...emptyRegionRow }],
            }))
            : [createTaxClass({ key: 'standard', name: 'Standard Tax Rates', ratePercent: data.tax_rate ?? '18', regions })]
          setFormData(prev => ({
            ...prev,
            tax_enabled: data.tax_enabled ?? prev.tax_enabled,
            tax_rate: data.tax_rate ?? prev.tax_rate,
            tax_origin_state: normalizeIndiaStateCode(data.tax_origin_state || prev.tax_origin_state),
            tax_price_display_shop: data.tax_price_display_shop || prev.tax_price_display_shop,
            tax_price_display_cart: data.tax_price_display_cart || prev.tax_price_display_cart,
            tax_price_display_suffix: data.tax_price_display_suffix || '',
            tax_display_totals: data.tax_display_totals ?? prev.tax_display_totals,
            prices_include_tax: data.prices_include_tax ?? prev.prices_include_tax,
            tax_regions: regions,
            tax_classes: classes,
          }))
        }

        if (slabsResponse.status === 'fulfilled') {
          const slabs = slabsResponse.value.data || []
          if (Array.isArray(slabs) && slabs.length) {
            setSlabRows(slabs.map((slab) => ({
              _id: slab._id,
              hsnCode: slab.hsnCode || '',
              ratePercent: slab.rate != null ? String(Number(slab.rate) * 100) : '',
              minAmount: slab.minAmount ?? '',
              maxAmount: slab.maxAmount ?? '',
              status: slab.status || 'active',
            })))
          }
        }
      } catch (error) {
        console.error('Failed to load tax settings', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [session])

  const filteredRegions = useMemo(() => {
    const term = regionSearch.trim().toLowerCase()
    if (!term) return formData.tax_classes
    return formData.tax_classes.map((taxClass) => {
      const regions = taxClass.regions.filter((row) =>
        [
          row.countryCode,
          row.stateCode,
          row.postalCode,
          row.city,
          row.ratePercent,
          row.name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      )
      return { ...taxClass, regions }
    })
  }, [formData.tax_classes, regionSearch])

  const handleTaxClassChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      tax_classes: prev.tax_classes.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleRegionChange = (classId, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      tax_classes: prev.tax_classes.map((item) => {
        if (item.id !== classId) return item
        return {
          ...item,
          regions: item.regions.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)),
        }
      })
    }))
  }

  const handleAddRegion = (classId) => {
    setFormData(prev => ({
      ...prev,
      tax_classes: prev.tax_classes.map((item) =>
        item.id === classId ? { ...item, regions: [...item.regions, { ...emptyRegionRow }] } : item
      ),
    }))
  }

  const handleRemoveRegions = (classId) => {
    const selected = selectedRegionIndexes[classId] || []
    if (!selected.length) return
    setFormData(prev => ({
      ...prev,
      tax_classes: prev.tax_classes.map((item) =>
        item.id === classId
          ? { ...item, regions: item.regions.filter((_, idx) => !selected.includes(idx)) }
          : item
      ),
    }))
    setSelectedRegionIndexes(prev => ({ ...prev, [classId]: [] }))
  }

  const handleAddTaxClass = () => {
    setFormData(prev => ({
      ...prev,
      tax_classes: [...prev.tax_classes, createTaxClass()],
    }))
  }

  const handleRemoveTaxClass = (classId) => {
    setFormData(prev => {
      const remaining = prev.tax_classes.filter((item) => item.id !== classId)
      return {
        ...prev,
        tax_classes: remaining.length
          ? remaining
          : [createTaxClass({ key: 'standard', name: 'Standard Tax Rates', ratePercent: prev.tax_rate ?? '18' })],
      }
    })
    setSelectedRegionIndexes(prev => {
      const next = { ...prev }
      delete next[classId]
      return next
    })
  }

  const handleSaveSettings = async () => {
    if (!session?.accessToken) return
    try {
      setSaving(true)
      const cleanedClasses = formData.tax_classes.map((item) => {
        const key = item.key ? normalizeTaxClassKey(item.key) : normalizeTaxClassKey(item.name)
        const regions = (item.regions || [])
          .map(normalizeRegionRow)
          .filter((row) => row.ratePercent != null || row.name || row.city || row.postalCode || row.stateCode)
        return {
          key,
          name: item.name || key,
          ratePercent: item.ratePercent === '' ? null : Number(item.ratePercent),
          regions: regions.length ? regions : [{ ...emptyRegionRow }],
        }
      }).filter((item) => item.key)
      const fallbackClass =
        cleanedClasses.find((item) => item.key === 'standard') || cleanedClasses[0]
      const cleanedRegions = fallbackClass?.regions || formData.tax_regions
        .map(normalizeRegionRow)
        .filter((row) => row.ratePercent != null || row.name || row.city || row.postalCode || row.stateCode)

      await settingsAPI.update(
        {
          tax_enabled: formData.tax_enabled,
          tax_rate: formData.tax_rate,
          tax_origin_state: formData.tax_origin_state,
          tax_price_display_shop: formData.tax_price_display_shop,
          tax_price_display_cart: formData.tax_price_display_cart,
          tax_price_display_suffix: formData.tax_price_display_suffix,
          tax_display_totals: formData.tax_display_totals,
          prices_include_tax: formData.prices_include_tax,
          tax_regions: cleanedRegions,
          tax_classes: cleanedClasses,
        },
        session.accessToken
      )
      toast.success('Tax settings saved successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save tax settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSlabChange = (index, field, value) => {
    setSlabRows(prev => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)))
  }

  const handleAddSlab = () => {
    setSlabRows(prev => [...prev, { ...emptySlabRow }])
  }

  const handleRemoveSlab = (index) => {
    const slab = slabRows[index]
    if (slab?._id) {
      setDeletedSlabIds(prev => [...prev, slab._id])
    }
    setSlabRows(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleSaveSlabs = async () => {
    if (!session?.accessToken) return
    try {
      setSlabSaving(true)
      const token = session.accessToken

      if (deletedSlabIds.length) {
        await Promise.all(deletedSlabIds.map((id) => taxAPI.removeSlab(id, token)))
        setDeletedSlabIds([])
      }

      const actions = slabRows
        .filter((row) => row.hsnCode && row.ratePercent !== '')
        .map((row) => {
          const payload = {
            hsnCode: row.hsnCode.trim(),
            rate: Number(row.ratePercent) / 100,
            minAmount: row.minAmount === '' ? 0 : Number(row.minAmount),
            maxAmount: row.maxAmount === '' ? null : Number(row.maxAmount),
            status: row.status || 'active',
          }
          if (row._id) {
            return taxAPI.updateSlab(row._id, payload, token)
          }
          return taxAPI.createSlab(payload, token)
        })

      if (actions.length) {
        await Promise.all(actions)
      }

      const refreshed = await taxAPI.listSlabs(token)
      const slabs = refreshed.data || []
      setSlabRows(slabs.map((slab) => ({
        _id: slab._id,
        hsnCode: slab.hsnCode || '',
        ratePercent: slab.rate != null ? String(Number(slab.rate) * 100) : '',
        minAmount: slab.minAmount ?? '',
        maxAmount: slab.maxAmount ?? '',
        status: slab.status || 'active',
      })))

      toast.success('Tax slabs saved successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save tax slabs')
    } finally {
      setSlabSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <>
      <PageTItle title="TAX SETTINGS" />
      <Row className="g-4">
        <Col lg={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <CardTitle as="h4" className="mb-0 d-flex align-items-center gap-2">
                <IconifyIcon icon="solar:money-bag-bold-duotone" className="text-primary fs-20" />
                GST Configuration
              </CardTitle>
              <Button variant="success" size="sm" onClick={handleSaveSettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardHeader>
            <CardBody>
              <Row className="g-3">
                <Col lg={6}>
                  <Form.Check
                    type="switch"
                    id="tax_enabled"
                    label="Enable tax rates and calculations"
                    checked={!!formData.tax_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_enabled: e.target.checked }))}
                  />
                </Col>
                <Col lg={6}>
                  <div className="mb-3">
                    <label htmlFor="tax_origin_state" className="form-label">Tax Origin State (GST)</label>
                    <Form.Select
                      id="tax_origin_state"
                      value={normalizeIndiaStateCode(formData.tax_origin_state)}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_origin_state: e.target.value }))}
                    >
                      <option value="">Select state</option>
                      {INDIA_STATES.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </Col>
                <Col lg={6}>
                  <div className="mb-3">
                    <label htmlFor="tax_rate" className="form-label">Default GST Rate (%)</label>
                    <input
                      id="tax_rate"
                      className="form-control"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: e.target.value }))}
                    />
                  </div>
                </Col>
                <Col lg={6}>
                  <div className="mb-3">
                    <label htmlFor="prices_include_tax" className="form-label">Prices include tax</label>
                    <Form.Select
                      id="prices_include_tax"
                      value={formData.prices_include_tax ? 'yes' : 'no'}
                      onChange={(e) => setFormData(prev => ({ ...prev, prices_include_tax: e.target.value === 'yes' }))}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </Form.Select>
                  </div>
                </Col>
                <Col lg={6}>
                  <div className="mb-3">
                    <label htmlFor="tax_price_display_shop" className="form-label">Display prices in the shop</label>
                    <Form.Select
                      id="tax_price_display_shop"
                      value={formData.tax_price_display_shop}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_price_display_shop: e.target.value }))}>
                      <option value="excluding">Excluding tax</option>
                      <option value="including">Including tax</option>
                    </Form.Select>
                  </div>
                </Col>
                <Col lg={6}>
                  <div className="mb-3">
                    <label htmlFor="tax_price_display_cart" className="form-label">Display prices during cart & checkout</label>
                    <Form.Select
                      id="tax_price_display_cart"
                      value={formData.tax_price_display_cart}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_price_display_cart: e.target.value }))}>
                      <option value="excluding">Excluding tax</option>
                      <option value="including">Including tax</option>
                    </Form.Select>
                  </div>
                </Col>
                <Col lg={6}>
                  <div className="mb-3">
                    <label htmlFor="tax_price_display_suffix" className="form-label">Price display suffix</label>
                    <input
                      id="tax_price_display_suffix"
                      className="form-control"
                      placeholder="e.g. incl. GST"
                      value={formData.tax_price_display_suffix}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_price_display_suffix: e.target.value }))}
                    />
                  </div>
                </Col>
                <Col lg={6} className="d-flex align-items-center">
                  <Form.Check
                    type="switch"
                    id="tax_display_totals"
                    label="Display tax totals"
                    checked={!!formData.tax_display_totals}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_display_totals: e.target.checked }))}
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>

        <Col lg={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <CardTitle as="h4" className="mb-0">Tax Classes</CardTitle>
              <div className="d-flex gap-2">
                <Button size="sm" variant="outline-primary" onClick={handleAddTaxClass}>
                  Add tax class
                </Button>
                <Button size="sm" variant="success" onClick={handleSaveSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <InputGroup className="mb-3">
                <InputGroup.Text>
                  <IconifyIcon icon="solar:magnifer-linear" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search region rules"
                  value={regionSearch}
                  onChange={(e) => setRegionSearch(e.target.value)}
                />
              </InputGroup>

              {filteredRegions.map((taxClass) => (
                <div key={taxClass.id} className="border rounded-3 p-3 mb-3">
                  <div className="d-flex flex-wrap gap-3 align-items-end justify-content-between mb-3">
                    <Row className="g-2 flex-grow-1">
                      <Col md={6} lg={4}>
                        <label className="form-label">Tax name</label>
                        <Form.Control
                          value={taxClass.name}
                          onChange={(e) => handleTaxClassChange(taxClass.id, 'name', e.target.value)}
                          placeholder="GST 18%"
                        />
                      </Col>
                      <Col md={6} lg={3}>
                        <label className="form-label">Default rate %</label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          value={taxClass.ratePercent}
                          onChange={(e) => handleTaxClassChange(taxClass.id, 'ratePercent', e.target.value)}
                          placeholder="18"
                        />
                      </Col>
                      <Col md={6} lg={5}>
                        <label className="form-label">Tax key</label>
                        <Form.Control
                          value={taxClass.key}
                          onChange={(e) => handleTaxClassChange(taxClass.id, 'key', e.target.value)}
                          placeholder="gst-18"
                        />
                      </Col>
                    </Row>
                    <div className="d-flex gap-2">
                      <Button size="sm" variant="outline-primary" onClick={() => handleAddRegion(taxClass.id)}>
                        Insert row
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleRemoveRegions(taxClass.id)}
                        disabled={!(selectedRegionIndexes[taxClass.id] || []).length}
                      >
                        Remove selected
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => handleRemoveTaxClass(taxClass.id)}>
                        Delete tax
                      </Button>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <Table className="align-middle table-bordered tax-settings-table">
                      <thead className="bg-light-subtle">
                        <tr>
                          <th style={{ width: 20 }}></th>
                          <th>Country</th>
                          <th>State code</th>
                          <th>Postcode / ZIP</th>
                          <th>City</th>
                          <th>Rate %</th>
                          <th>Tax name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(taxClass.regions || []).map((row, index) => (
                          <tr key={`region-${taxClass.id}-${index}`}>
                            <td className="text-center">
                              <Form.Check
                                type="checkbox"
                                checked={(selectedRegionIndexes[taxClass.id] || []).includes(index)}
                                onChange={(e) => {
                                  setSelectedRegionIndexes(prev => {
                                    const current = prev[taxClass.id] || []
                                    const next = e.target.checked
                                      ? [...current, index]
                                      : current.filter((idx) => idx !== index)
                                    return { ...prev, [taxClass.id]: next }
                                  })
                                }}
                              />
                            </td>
                            <td>
                              <Form.Select value={INDIA_COUNTRY.code} disabled className="tax-settings-field tax-settings-country">
                                <option value={INDIA_COUNTRY.code}>{INDIA_COUNTRY.name}</option>
                              </Form.Select>
                            </td>
                            <td>
                              <Form.Select
                                className="tax-settings-field tax-settings-state"
                                value={row.stateCode || '*'}
                                onChange={(e) => handleRegionChange(taxClass.id, index, 'stateCode', e.target.value)}
                              >
                                <option value="*">All states</option>
                                {INDIA_STATES.map((state) => (
                                  <option key={state.code} value={state.code}>
                                    {state.name}
                                  </option>
                                ))}
                              </Form.Select>
                            </td>
                            <td>
                              <Form.Control
                                className="tax-settings-field tax-settings-postal"
                                value={row.postalCode}
                                onChange={(e) => handleRegionChange(taxClass.id, index, 'postalCode', e.target.value)}
                                placeholder="110001-110099"
                              />
                            </td>
                            <td>
                              <Form.Control
                                className="tax-settings-field tax-settings-city"
                                value={row.city}
                                onChange={(e) => handleRegionChange(taxClass.id, index, 'city', e.target.value)}
                                placeholder="*"
                              />
                            </td>
                            <td>
                              <Form.Control
                                className="tax-settings-field tax-settings-rate"
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.ratePercent}
                                onChange={(e) => handleRegionChange(taxClass.id, index, 'ratePercent', e.target.value)}
                                placeholder="Use default"
                              />
                            </td>
                            <td>
                              <Form.Control
                                className="tax-settings-field tax-settings-name"
                                value={row.name}
                                onChange={(e) => handleRegionChange(taxClass.id, index, 'name', e.target.value)}
                                placeholder={taxClass.name || 'GST'}
                              />
                            </td>
                            <td>
                              <Form.Select
                                className="tax-settings-field tax-settings-status"
                                value={row.status}
                                onChange={(e) => handleRegionChange(taxClass.id, index, 'status', e.target.value)}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </Form.Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </Col>

        <Col lg={12}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <CardTitle as="h4" className="mb-0">HSN Tax Slabs</CardTitle>
              <div className="d-flex gap-2">
                <Button size="sm" variant="outline-primary" onClick={handleAddSlab}>
                  Add slab
                </Button>
                <Button size="sm" variant="success" onClick={handleSaveSlabs} disabled={slabSaving}>
                  {slabSaving ? 'Saving...' : 'Save slabs'}
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="table-responsive">
                <Table className="align-middle table-bordered">
                  <thead className="bg-light-subtle">
                    <tr>
                      <th>HSN Code</th>
                      <th>Rate %</th>
                      <th>Min Amount</th>
                      <th>Max Amount</th>
                      <th>Status</th>
                      <th style={{ width: 60 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slabRows.map((row, index) => (
                      <tr key={`slab-${row._id || index}`}>
                        <td>
                          <Form.Control
                            value={row.hsnCode}
                            onChange={(e) => handleSlabChange(index, 'hsnCode', e.target.value)}
                            placeholder="8708"
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.ratePercent}
                            onChange={(e) => handleSlabChange(index, 'ratePercent', e.target.value)}
                            placeholder="18"
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            min="0"
                            value={row.minAmount}
                            onChange={(e) => handleSlabChange(index, 'minAmount', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            min="0"
                            value={row.maxAmount}
                            onChange={(e) => handleSlabChange(index, 'maxAmount', e.target.value)}
                            placeholder="No max"
                          />
                        </td>
                        <td>
                          <Form.Select
                            value={row.status}
                            onChange={(e) => handleSlabChange(index, 'status', e.target.value)}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </Form.Select>
                        </td>
                        <td className="text-center">
                          <Button variant="outline-danger" size="sm" onClick={() => handleRemoveSlab(index)}>
                            <IconifyIcon icon="solar:trash-bin-minimalistic-2-broken" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default TaxSettingsPage
