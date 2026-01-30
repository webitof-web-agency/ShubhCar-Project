import PageTItle from '@/components/PageTItle'
import { Row } from 'react-bootstrap'
import AddProduct from './components/AddProduct'

export const metadata = {
  title: 'Add Product'
}

const ProductAddPage = () => {
  return (
    <>
      <PageTItle title="ADD PRODUCT" />
      <Row>
        <AddProduct />
      </Row>
    </>
  )
}

export default ProductAddPage
