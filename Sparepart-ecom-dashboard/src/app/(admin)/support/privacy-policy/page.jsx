export const dynamic = 'force-dynamic'
import PageTItle from '@/components/PageTItle'
import PrivacyPolicyForm from './components/PrivacyPolicyForm'

export const metadata = {
  title: 'Privacy Policy Management',
}

const PrivacyPolicyPage = () => {
  return (
    <>
      <PageTItle title="PRIVACY POLICY MANAGEMENT" />
      <PrivacyPolicyForm />
    </>
  )
}

export default PrivacyPolicyPage
