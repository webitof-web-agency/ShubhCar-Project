export const dynamic = 'force-dynamic'
import ProductDetails from './components/ProductDetails'
import Step from './components/Step'
import Review from './components/Review'
import ItemDetails from './components/ItemDetails'
import { Row, Col } from 'react-bootstrap'
import PageTItle from '@/components/PageTItle'
export const generateMetadata = async ({ params }) => {
  return {
    title: 'Product Details',
  }
}
const ProductDetailsPage = async () => {
  return (
    <>
      <PageTItle title="PRODUCT DETAILS" />
      <ProductDetails />
      <Step />
      <Row>
        <ItemDetails />
        <Review />
      </Row>
    </>
  )
}
export default ProductDetailsPage
