import PageTItle from '@/components/PageTItle'
import { Row } from 'react-bootstrap'
import AddProduct from '../product-add/components/AddProduct'
// import VehicleVariantCreator from '@/components/VehicleVariantCreator'

export const metadata = {
  title: 'Edit Product'
}

const ProductEditPage = async ({ searchParams }) => {
  // Next.js 15+ requires awaiting searchParams
  const params = await searchParams
  const productId = params?.id

  return (
    <>
      <PageTItle title="EDIT PRODUCT" />
      <Row>
        <AddProduct />
      </Row>
      
      {/* Variant creator temporarily disabled */}
      {/* {productId && (
        <Row className="mt-3">
          <VehicleVariantCreator productId={productId} />
        </Row>
      )} */}
    </>
  )
}

export default ProductEditPage
