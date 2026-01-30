import ModernDashboard from './components/ModernDashboard'
import PageTItle from '@/components/PageTItle'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard',
}

const DashboardPage = () => {
  return (
    <>
      <PageTItle title="DASHBOARD" />
      <ModernDashboard />
    </>
  )
}

export default DashboardPage
