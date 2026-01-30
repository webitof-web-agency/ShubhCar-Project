export const dynamic = 'force-dynamic'
import SellerAddDetails from './components/SellerAddDetails'
import SellerAddData from './components/SellerAddData'
import { Row } from 'react-bootstrap'
import PageTItle from '@/components/PageTItle'
import Link from 'next/link'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
export const metadata = {
  title: 'Seller Add',
}
const SellerAddPage = () => {
  return (
    <>
      <PageTItle title="SELLER ADD" />
      <div className="d-flex justify-content-end mb-3">
        <Link href="/seller/seller-list" className="btn btn-outline-secondary">
          <IconifyIcon icon="solar:arrow-left-bold-duotone" className="me-2 fs-18" />
          Back to List
        </Link>
      </div>
      <Row>
        <SellerAddDetails />
        <SellerAddData />
      </Row>
    </>
  )
}
export default SellerAddPage
