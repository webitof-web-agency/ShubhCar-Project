export const dynamic = 'force-dynamic'
import PageTItle from '@/components/PageTItle'
import TermsConditionForm from './components/TermsConditionForm'

export const metadata = {
  title: 'Terms & Conditions Management',
}

const TermsConditionPage = () => {
  return (
    <>
      <PageTItle title="TERMS & CONDITIONS MANAGEMENT" />
      <TermsConditionForm />
    </>
  )
}

export default TermsConditionPage
