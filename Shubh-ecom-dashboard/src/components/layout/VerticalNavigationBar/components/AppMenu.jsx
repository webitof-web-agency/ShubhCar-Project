'use client'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { findAllParent, findMenuItem, getMenuItemFromURL } from '@/helpers/Menu'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Collapse } from 'react-bootstrap'
import { usePermissions } from '@/hooks/usePermissions'
const MenuItemWithChildren = ({ item, className, linkClassName, subMenuClassName, activeMenuItems, toggleMenu }) => {
  const [open, setOpen] = useState(activeMenuItems.includes(item.key))
  useEffect(() => {
    const nextOpen = activeMenuItems.includes(item.key)
    setOpen((prev) => (prev === nextOpen ? prev : nextOpen))
  }, [activeMenuItems, item.key])
  const toggleMenuItem = (e) => {
    e.preventDefault()
    const status = !open
    setOpen(status)
    if (toggleMenu) toggleMenu(item, status)
    return false
  }
  const getActiveClass = useCallback(
    (item) => {
      return activeMenuItems?.includes(item.key) ? 'active' : ''
    },
    [activeMenuItems],
  )
  return (
    <li className={className}>
      <div onClick={toggleMenuItem} aria-expanded={open} role="button" className={clsx(linkClassName)}>
        {item.icon && (
          <span className="nav-icon">
            {' '}
            <IconifyIcon icon={item.icon} />{' '}
          </span>
        )}
        <span className="nav-text">{item.label}</span>
        {!item.badge ? (
          <IconifyIcon icon="bx:chevron-down" className="menu-arrow ms-auto" />
        ) : (
          <span className={`badge badge-pill text-end bg-${item.badge.variant}`}>{item.badge.text}</span>
        )}
      </div>
      <Collapse in={open}>
        <div>
          <ul className={clsx(subMenuClassName)}>
            {(item.children || []).map((child, idx) => {
              return (
                <Fragment key={child.key + idx}>
                  {child.children ? (
                    <MenuItemWithChildren
                      item={child}
                      linkClassName={clsx('nav-link', getActiveClass(child))}
                      activeMenuItems={activeMenuItems}
                      className="sub-nav-item"
                      subMenuClassName="nav sub-navbar-nav"
                      toggleMenu={toggleMenu}
                    />
                  ) : (
                    <MenuItem item={child} className="sub-nav-item" linkClassName={clsx('sub-nav-link', getActiveClass(child))} />
                  )}
                </Fragment>
              )
            })}
          </ul>
        </div>
      </Collapse>
    </li>
  )
}
const MenuItem = ({ item, className, linkClassName }) => {
  return (
    <li className={className}>
      <MenuItemLink item={item} className={linkClassName} />
    </li>
  )
}
const MenuItemLink = ({ item, className }) => {
  return (
    <Link
      href={item.url ?? ''}
      target={item.target}
      prefetch={false}
      className={clsx(className, {
        disabled: item.isDisabled,
      })}>
      {item.icon && (
        <span className="nav-icon">
          <IconifyIcon icon={item.icon} />
        </span>
      )}
      <span className="nav-text">{item.label}</span>
      {item.badge && <span className={`badge badge-pill text-end bg-${item.badge.variant}`}>{item.badge.text}</span>}
    </Link>
  )
}
const hasItemPermission = (item, hasPermission) => {
  if (!item?.permission) return true
  if (Array.isArray(item.permission)) {
    return item.permission.some((perm) => hasPermission(perm))
  }
  return hasPermission(item.permission)
}

const filterMenuItems = (items, hasPermission) => {
  return (items || [])
    .map((item) => {
      if (!hasItemPermission(item, hasPermission)) return null
      if (item.children) {
        const children = filterMenuItems(item.children, hasPermission)
        if (!children.length) return null
        return { ...item, children }
      }
      if (!hasItemPermission(item, hasPermission)) return null
      return item
    })
    .filter(Boolean)
}

const areArraysEqual = (a = [], b = []) => {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

const AppMenu = ({ menuItems }) => {
  const pathname = usePathname()
  const { hasPermission } = usePermissions()
  const [activeMenuItems, setActiveMenuItems] = useState([])
  const visibleMenuItems = useMemo(
    () => filterMenuItems(menuItems, hasPermission),
    [menuItems, hasPermission],
  )
  const toggleMenu = (menuItem, show) => {
    if (!show) return
    const next = [menuItem.key, ...findAllParent(visibleMenuItems, menuItem)]
    setActiveMenuItems((prev) => (areArraysEqual(prev, next) ? prev : next))
  }
  const getActiveClass = useCallback(
    (item) => {
      return activeMenuItems?.includes(item.key) ? 'active' : ''
    },
    [activeMenuItems],
  )
  const activeMenu = useCallback(() => {
    const trimmedURL = pathname?.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
    const matchingMenuItem = getMenuItemFromURL(visibleMenuItems, trimmedURL)
    if (matchingMenuItem) {
      const activeMt = findMenuItem(visibleMenuItems, matchingMenuItem.key)
      if (activeMt) {
        const nextActive = [activeMt.key, ...findAllParent(visibleMenuItems, activeMt)]
        setActiveMenuItems((prev) => (areArraysEqual(prev, nextActive) ? prev : nextActive))
      }
      setTimeout(() => {
        const activatedItem = document.querySelector(`#leftside-menu-container .simplebar-content a[href="${trimmedURL}"]`)
        if (activatedItem) {
          const simplebarContent = document.querySelector('#leftside-menu-container .simplebar-content-wrapper')
          if (simplebarContent) {
            const offset = activatedItem.offsetTop - window.innerHeight * 0.4
            scrollTo(simplebarContent, offset, 600)
          }
        }
      }, 400)

      // scrollTo (Left Side Bar Active Menu)
      const easeInOutQuad = (t, b, c, d) => {
        t /= d / 2
        if (t < 1) return (c / 2) * t * t + b
        t--
        return (-c / 2) * (t * (t - 2) - 1) + b
      }
      const scrollTo = (element, to, duration) => {
        const start = element.scrollTop,
          change = to - start,
          increment = 20
        let currentTime = 0
        const animateScroll = function () {
          currentTime += increment
          const val = easeInOutQuad(currentTime, start, change, duration)
          element.scrollTop = val
          if (currentTime < duration) {
            setTimeout(animateScroll, increment)
          }
        }
        animateScroll()
      }
    }
  }, [pathname, visibleMenuItems])
  useEffect(() => {
    if (visibleMenuItems && visibleMenuItems.length > 0) activeMenu()
  }, [activeMenu, visibleMenuItems])
  return (
    <ul className="navbar-nav" id="navbar-nav">
      {(visibleMenuItems || []).map((item, idx) => {
        return (
          <Fragment key={item.key + idx}>
            {item.isTitle ? (
              <li
                className={clsx('menu-title', {
                  'mt-2': idx != 0,
                })}>
                {item.label}
              </li>
            ) : (
              <>
                {item.children ? (
                  <MenuItemWithChildren
                    item={item}
                    toggleMenu={toggleMenu}
                    className="nav-item"
                    linkClassName={clsx('nav-link menu-arrow', getActiveClass(item))}
                    subMenuClassName="nav sub-navbar-nav"
                    activeMenuItems={activeMenuItems}
                  />
                ) : (
                  <MenuItem item={item} linkClassName={clsx('nav-link', getActiveClass(item))} className="nav-item" />
                )}
              </>
            )}
          </Fragment>
        )
      })}
    </ul>
  )
}
export default AppMenu
