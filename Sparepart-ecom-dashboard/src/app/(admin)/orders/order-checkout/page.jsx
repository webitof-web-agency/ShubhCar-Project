import PageTItle from '@/components/PageTItle'
import CheckoutForm from './components/CheckoutForm'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Checkout',
}
const CheckoutPage = () => {
  return (
    <>
      <PageTItle title="ORDER CHECKOUT" />
      <CheckoutForm />
    </>
  )
}
export default CheckoutPage
