'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useLayoutContext } from '@/context/useLayoutContext'
const LeftSideBarToggle = () => {
  const {
    menu: { size },
    changeMenu: { size: changeMenuSize },
  } = useLayoutContext()
  const handleMenuSize = () => {
    // Only toggle between 'default' (expanded) and 'condensed' (collapsed)
    // Never hide the sidebar
    if (size === 'condensed') {
      changeMenuSize('default')
    } else {
      changeMenuSize('condensed')
    }
  }
  
  // Removed useEffect that was handling hidden state on route change
  return (
    <div className="topbar-item">
      <button type="button" onClick={handleMenuSize} className="button-toggle-menu me-2">
        <IconifyIcon icon="solar:hamburger-menu-broken" className="fs-24 align-middle" />
      </button>
    </div>
  )
}
export default LeftSideBarToggle
