import PageTItle from '@/components/PageTItle'
import InvoiceCard from './components/InvoiceCard'
import InvoiceList from './components/InvoiceList'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Invoice List',
}
const InvoiceListPage = () => {
  return (
    <>
      <PageTItle title="INVOICES LIST" />
      <InvoiceCard />
      <InvoiceList />
    </>
  )
}
export default InvoiceListPage
