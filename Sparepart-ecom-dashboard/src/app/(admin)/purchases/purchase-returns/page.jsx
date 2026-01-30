import PageTItle from '@/components/PageTItle'
import ReturnDataCard from './Components/ReturnDataCard'
import PurchaseReturnsList from './Components/PurchaseReturnsList'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Purchase Returns',
}
const PurchaseReturnsPage = () => {
  return (
    <>
      <PageTItle title="PURCHASE RETURNS" />
      <ReturnDataCard />
      <PurchaseReturnsList />
    </>
  )
}
export default PurchaseReturnsPage
