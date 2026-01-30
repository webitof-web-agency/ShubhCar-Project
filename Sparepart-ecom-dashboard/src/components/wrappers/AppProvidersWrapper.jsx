'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css';
import { DEFAULT_PAGE_TITLE } from '@/context/constants'
import dynamic from 'next/dynamic'
const LayoutProvider = dynamic(() => import('@/context/useLayoutContext').then((mod) => mod.LayoutProvider), {
  ssr: false,
})
import { NotificationProvider } from '@/context/useNotificationContext'
import { TitleProvider } from '@/context/useTitleContext'
const AppProvidersWrapper = ({ children }) => {
  const handleChangeTitle = () => {
    if (document.visibilityState == 'show') document.title = 'Please come back'
    else document.title = DEFAULT_PAGE_TITLE
  }
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const splash = document.querySelector('#splash-screen')
      const container = document.querySelector('#__next_splash')
      if (container?.hasChildNodes()) {
        splash?.classList.add('remove')
      } else if (container) {
        const observer = new MutationObserver(() => {
          if (container.hasChildNodes()) {
            splash?.classList.add('remove')
            observer.disconnect()
          }
        })
        observer.observe(container, { childList: true, subtree: true })
        return () => observer.disconnect()
      }
    }
    document.addEventListener('visibilitychange', handleChangeTitle)
    return () => {
      document.removeEventListener('visibilitychange', handleChangeTitle)
    }
  }, [])
  return (
    <SessionProvider>
      <LayoutProvider>
        <TitleProvider>
          <NotificationProvider>
            {children}
            <ToastContainer theme="colored" />
          </NotificationProvider>
        </TitleProvider>
      </LayoutProvider>
    </SessionProvider>
  )
}
export default AppProvidersWrapper
