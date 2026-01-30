'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'
import { Card, CardFooter, CardTitle, Col, Row, Spinner, Alert, Badge, Form } from 'react-bootstrap'
import couponService from '@/services/couponService'
import { currency } from '@/context/constants'

const CouponsDataList = ({ coupons = [], setCoupons, loading = false }) => {
  const { data: session } = useSession()
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState(null)

  const handleDelete = async (couponId) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return

    try {
      setDeleting(couponId)
      await couponService.deleteCoupon(couponId, session.accessToken)
      
      // Remove from UI
      setCoupons(coupons.filter(c => c._id !== couponId))
    } catch (err) {
      alert(err.message || 'Failed to delete coupon')
    } finally {
      setDeleting(null)
    }
  }

  const handleStatusToggle = async (couponId, currentStatus) => {
    try {
      // Find the full coupon data to preserve all fields
      const coupon = coupons.find(c => c._id === couponId)
      if (!coupon) return

      // Update only the isActive field while preserving others
      const updateData = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        usageLimitTotal: coupon.usageLimitTotal,
        usageLimitPerUser: coupon.usageLimitPerUser,
        validFrom: coupon.validFrom,
        validTo: coupon.validTo,
        isActive: !currentStatus, // Toggle the status
      }

      // Update status in backend
      await couponService.updateCoupon(
        couponId,
        updateData,
        session.accessToken
      )
      
      // Update UI - this will also update the stats in CouponsBoxs
      setCoupons(coupons.map(c => 
        c._id === couponId ? { ...c, isActive: !currentStatus } : c
      ))
    } catch (err) {
      alert(err.message || 'Failed to update status')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const isExpired = (validTo) => {
    return new Date(validTo) < new Date()
  }

  if (loading) {
    return (
      <Row>
        <Col xl={12}>
          <Card>
            <div className="p-4 text-center">
              <Spinner animation="border" />
              <p className="mt-2">Loading coupons...</p>
            </div>
          </Card>
        </Col>
      </Row>
    )
  }

  if (error) {
    return (
      <Row>
        <Col xl={12}>
          <Alert variant="danger">{error}</Alert>
        </Col>
      </Row>
    )
  }

  return (
    <Row>
      <Col xl={12}>
        <Card>
          <div className="d-flex card-header justify-content-between align-items-center">
            <div>
              <CardTitle as={'h4'}>All Coupons</CardTitle>
            </div>
            <Link href="/coupons/coupons-add" className="btn btn-primary btn-sm">
              <IconifyIcon icon="solar:add-circle-broken" className="me-1" />
              Add Coupon
            </Link>
          </div>
          <div>
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover table-centered">
                <thead className="bg-light-subtle">
                  <tr>
                    <th style={{ width: 20 }}>
                      <Form.Check />
                    </th>
                    <th>Code</th>
                    <th>Discount Type</th>
                    <th>Discount Value</th>
                    <th>Min Order Amount</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-4">
                        <p className="text-muted">No coupons found</p>
                        <Link href="/coupons/coupons-add" className="btn btn-sm btn-primary">
                          Create First Coupon
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    coupons.map((coupon) => (
                      <tr key={coupon._id}>
                        <td>
                          <Form.Check />
                        </td>
                        <td>
                          <strong className="text-primary">{coupon.code}</strong>
                        </td>
                        <td>
                          <Badge bg={coupon.discountType === 'percent' ? 'info' : 'success'}>
                            {coupon.discountType === 'percent' ? 'Percentage' : 'Flat Amount'}
                          </Badge>
                        </td>
                        <td>
                          {coupon.discountType === 'percent' 
                            ? `${coupon.discountValue}%` 
                            : `${currency}${coupon.discountValue}`}
                        </td>
                        <td>{currency}{coupon.minOrderAmount || 0}</td>
                        <td>{formatDate(coupon.validFrom)}</td>
                        <td>{formatDate(coupon.validTo)}</td>
                        <td>
                          {isExpired(coupon.validTo) ? (
                            <span className="badge text-danger bg-danger-subtle fs-12">
                              <IconifyIcon icon="bx:x" /> Expired
                            </span>
                          ) : coupon.isActive ? (
                            <span className="badge text-success bg-success-subtle fs-12">
                              <IconifyIcon icon="bx:check-double" /> Active
                            </span>
                          ) : (
                            <span className="badge text-warning bg-warning-subtle fs-12">
                              <IconifyIcon icon="bx:pause" /> Inactive
                            </span>
                          )}
                        </td>
                        <td>
                          <Form.Check
                            type="switch"
                            id={`status-${coupon._id}`}
                            checked={coupon.isActive}
                            onChange={() => handleStatusToggle(coupon._id, coupon.isActive)}
                            disabled={isExpired(coupon.validTo)}
                            title={isExpired(coupon.validTo) ? 'Cannot toggle expired coupons' : 'Toggle active status'}
                          />
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              onClick={() => handleDelete(coupon._id)}
                              className="btn btn-soft-danger btn-sm"
                              disabled={deleting === coupon._id}
                            >
                              {deleting === coupon._id ? (
                                <Spinner size="sm" />
                              ) : (
                                <IconifyIcon icon="solar:trash-bin-minimalistic-2-broken" className="align-middle fs-18" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  )
}

export default CouponsDataList
