export const dynamic = 'force-dynamic'
import HelpCenter from './components/HelpCenter'
import PageTItle from '@/components/PageTItle'
export const metadata = {
  title: 'Help Center',
}
const HelpCenterPage = () => {
  return (
    <>
      <PageTItle title="HELP CENTER" />
      <HelpCenter />
    </>
  )
}
export default HelpCenterPage
