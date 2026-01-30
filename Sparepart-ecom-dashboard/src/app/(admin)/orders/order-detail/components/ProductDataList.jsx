'use client';
import { currency } from '@/context/constants'
import React from 'react'
import { Card, CardBody, CardHeader, CardTitle, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Badge } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getStatusBadge } from '@/helpers/orderApi'
import { API_BASE_URL, API_ORIGIN } from '@/helpers/apiBase'

const ProductDataList = ({ items = [], orderStatus }) => {
  return (
    <Card className="border-0 shadow-sm mb-4">
      <CardHeader className="bg-transparent border-bottom border-light py-3">
        <CardTitle as={'h5'} className="mb-0">Order Items <span className="text-muted fw-normal ms-1">({items.length})</span></CardTitle>
      </CardHeader>
      <CardBody className="p-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0 table-nowrap">
            <thead className="bg-light text-secondary text-uppercase fs-12">
              <tr>
                <th style={{ width: '40%' }} className="ps-4 py-3">Product</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-center">Qty</th>
                <th className="py-3 text-end">Price</th>
                <th className="py-3 text-end">Tax</th>
                <th className="py-3 text-end pe-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="text-muted">No items found in this order</div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="ps-4 py-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar-md bg-light rounded-3 d-flex align-items-center justify-content-center flex-shrink-0">
                          {(() => {
                            const imageUrl =
                              item.productId?.images?.[0]?.url ||
                              item.product?.images?.[0]?.url ||
                              item.productImages?.[0]?.url ||
                              '';
                            if (imageUrl) {
                              const src = imageUrl.startsWith('http') ? imageUrl : `${API_ORIGIN}${imageUrl}`;
                              return <img src={src} alt={item.productId?.name || 'Product'} width={48} height={48} className="rounded-3 object-fit-cover" />;
                            }
                            return <IconifyIcon icon="solar:box-broken" className="text-secondary fs-24 opacity-50" />;
                          })()}
                        </div>
                        <div>
                          <h6 className="fw-semibold text-dark mb-1 text-wrap text-break" style={{ maxWidth: '300px' }}>
                            {item.productId?.name || 'Unknown Product'}
                          </h6>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      {(() => {
                        const resolvedStatus = orderStatus || item.status || 'pending';
                        const badge = getStatusBadge(resolvedStatus);
                        return (
                          <Badge bg={badge.bg} className="text-capitalize">
                            {badge.text}
                          </Badge>
                        );
                      })()}
                    </td>
                    <td className="py-3 text-center text-dark fw-medium">{item.quantity}</td>
                    <td className="py-3 text-end text-dark">{currency}{(item.price || 0).toFixed(2)}</td>
                    <td className="py-3 text-end text-muted">{currency}{(item.taxAmount || 0).toFixed(2)}</td>
                    <td className="py-3 text-end pe-4 fw-bold text-dark">
                      {currency}{(item.total || (item.quantity || 0) * (item.price || 0) + (item.taxAmount || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  )
}

export default ProductDataList
