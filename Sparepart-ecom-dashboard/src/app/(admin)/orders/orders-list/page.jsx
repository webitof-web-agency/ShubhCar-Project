import PageTItle from '@/components/PageTItle'
import OrdersList from './components/OrdersList'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Orders List',
}
const page = () => {
  return (
    <>
      <PageTItle title="ORDERS LIST" />
      <OrdersList />
    </>
  )
}
export default page
