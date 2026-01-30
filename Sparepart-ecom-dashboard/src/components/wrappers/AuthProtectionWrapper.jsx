'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import FallbackLoading from '../FallbackLoading'
const AuthProtectionWrapper = ({ children }) => {
  const { status } = useSession()
  const { push } = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status == 'unauthenticated') {
      push(`/auth/sign-in?redirectTo=${pathname}`)
    }
  }, [status, push, pathname])

  if (status == 'unauthenticated') {
    return <FallbackLoading />
  }
  return <Suspense>{children}</Suspense>
}
export default AuthProtectionWrapper
