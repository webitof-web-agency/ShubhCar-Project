import logoDark from '@/assets/images/logo-dark.png'
import AppProvidersWrapper from '@/components/wrappers/AppProvidersWrapper'
import { Inter, Outfit } from 'next/font/google'
import Image from 'next/image'
import NextTopLoader from 'nextjs-toploader'
import 'choices.js/public/assets/styles/choices.min.css'
import '@/assets/scss/app.scss'
import { DEFAULT_PAGE_TITLE } from '@/context/constants'
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-primary',
  display: 'swap',
})
export const metadata = {
  title: {
    default: DEFAULT_PAGE_TITLE,
  },
  description: 'Admin Panel - Dashboard',
}
const splashScreenStyles = `
#splash-screen {
  position: fixed;
  top: 50%;
  left: 50%;
  background: #f8fafc;
  display: flex;
  height: 100%;
  width: 100%;
  transform: translate(-50%, -50%);
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 1;
  transition: all 15s linear;
  overflow: hidden;
}

#splash-screen.remove {
  animation: fadeout 0.7s forwards;
  z-index: 0;
}

@keyframes fadeout {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

.splash-shell {
  width: min(980px, 92vw);
}

.splash-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
}

.splash-card {
  grid-column: span 3;
  height: 120px;
  border-radius: 18px;
  background: #e9edf3;
  position: relative;
  overflow: hidden;
}

.splash-panel {
  grid-column: span 8;
  height: 320px;
  border-radius: 22px;
  background: #e9edf3;
  position: relative;
  overflow: hidden;
}

.splash-side {
  grid-column: span 4;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.splash-block {
  height: 96px;
  border-radius: 18px;
  background: #e9edf3;
  position: relative;
  overflow: hidden;
}

.splash-card::after,
.splash-panel::after,
.splash-block::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, #f7f9fc, transparent);
  animation: splash-shimmer 1.4s infinite;
}

@keyframes splash-shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 991px) {
  .splash-card {
    grid-column: span 6;
  }
  .splash-panel {
    grid-column: span 12;
    height: 260px;
  }
  .splash-side {
    grid-column: span 12;
    flex-direction: row;
  }
  .splash-block {
    flex: 1;
  }
}
`
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style suppressHydrationWarning>{splashScreenStyles}</style>
      </head>
      <body className={`${inter.variable}`} suppressHydrationWarning>
        <div id="splash-screen">
          <div className="splash-shell">
            <div className="splash-grid">
              <div className="splash-card" />
              <div className="splash-card" />
              <div className="splash-card" />
              <div className="splash-card" />
              <div className="splash-panel" />
              <div className="splash-side">
                <div className="splash-block" />
                <div className="splash-block" />
                <div className="splash-block" />
              </div>
            </div>
          </div>
        </div>
        <NextTopLoader color="var(--bs-primary)" showSpinner={false} />
        <div id="__next_splash">
          <AppProvidersWrapper>{children}</AppProvidersWrapper>
        </div>
      </body>
    </html>
  )
}
