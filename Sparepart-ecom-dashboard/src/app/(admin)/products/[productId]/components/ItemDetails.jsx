import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'
import React from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col } from 'react-bootstrap'
const ItemDetails = () => {
  return (
    <Col lg={6}>
      <Card>
        <CardHeader>
          <CardTitle as={'h4'}>Items Detail</CardTitle>
        </CardHeader>
        <CardBody>
          <div>
            <ul className="d-flex flex-column gap-2 list-unstyled fs-14 text-muted mb-0">
              <li>
                <span className="fw-medium text-dark">Product Dimensions</span>
                <span className="mx-2">:</span>53.3 x 40.6 x 6.4 cm; 500 Grams
              </li>
              <li>
                <span className="fw-medium text-dark">Date First Available</span>
                <span className="mx-2">:</span>22 September 2023
              </li>
              <li>
                <span className="fw-medium text-dark">Department</span>
                <span className="mx-2">:</span>Men
              </li>
              <li>
                <span className="fw-medium text-dark">Manufacturer </span>
                <span className="mx-2">:</span>Peenya Industrial Area, Bengaluru, Karnataka 560058
              </li>
              <li>
                <span className="fw-medium text-dark">ASIN</span>
                <span className="mx-2">:</span>B0CJMML118
              </li>
              <li>
                <span className="fw-medium text-dark">Item model number</span>
                <span className="mx-2">:</span> 1137AZ
              </li>
              <li>
                <span className="fw-medium text-dark">Country of Origin</span>
                <span className="mx-2">:</span>India
              </li>
              <li>
                <span className="fw-medium text-dark">Manufacturer </span>
                <span className="mx-2">:</span>Plot 42, MIDC, Pimpri-Chinchwad, Pune 411018
              </li>
              <li>
                <span className="fw-medium text-dark">Packer </span>
                <span className="mx-2">:</span>Warehouse 7, Bhiwandi, Thane, Maharashtra 421302
              </li>
              <li>
                <span className="fw-medium text-dark">Importer</span>
                <span className="mx-2">:</span>58 Okhla Industrial Estate, New Delhi 110020
              </li>
              <li>
                <span className="fw-medium text-dark">Item Weight</span>
                <span className="mx-2">:</span>500 g
              </li>
              <li>
                <span className="fw-medium text-dark">Item Dimensions LxWxH</span>
                <span className="mx-2">:</span>53.3 x 40.6 x 6.4 Centimeters
              </li>
              <li>
                <span className="fw-medium text-dark">Generic Name</span>
                <span className="mx-2">:</span>T-Shirt
              </li>
              <li>
                <span className="fw-medium text-dark">Best Sellers Rank</span>
                <span className="mx-2">:</span>#13 in Clothing &amp; Accessories
              </li>
            </ul>
          </div>
          <div className="mt-3">
            <Link href="" className="link-primary text-decoration-underline link-offset-2">
              View More Details <IconifyIcon icon="bx:arrow-to-right" className="align-middle fs-16" />
            </Link>
          </div>
        </CardBody>
      </Card>
    </Col>
  )
}
export default ItemDetails
