import PageTItle from '@/components/PageTItle'
import OrdersList from '../orders-list/components/OrdersList'

export const metadata = {
  title: 'Create Manual Order',
}

const ManualCreatePage = () => {
  return (
    <>
      <PageTItle title="CREATE MANUAL ORDER" />
      <OrdersList hideList />
    </>
  )
}

export default ManualCreatePage
