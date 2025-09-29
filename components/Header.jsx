"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import SmartImage from './SmartImage'
import Link from 'next/link'



export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [avatarLoaded, setAvatarLoaded] = useState(true)
  const [avatarError, setAvatarError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    
    // Check authentication using the same method as AuthWrapper
    const checkAuth = async () => {
      try {
        // Import getCurrentUserAction dynamically to avoid SSR issues
        const { getCurrentUserAction } = await import('../lib/actions')
        const result = await getCurrentUserAction()
        
        console.log('Header: auth check result', result)
        
        if (result.success && result.user) {
          setIsAuthenticated(true)
          setUser(result.user)
          console.log('Header: authenticated as', result.user.username)
          // Keep user data in localStorage for backwards compatibility
          localStorage.setItem('user', JSON.stringify(result.user))
        } else {
          console.log('Header: not authenticated via cookie')
          setIsAuthenticated(false)
          setUser(null)
          // Clear any stale data
          localStorage.removeItem('user')
          localStorage.removeItem('token')
        }
      } catch (error) {
        console.error('Header: auth check failed', error)
        setIsAuthenticated(false)
        setUser(null)
        localStorage.removeItem('user')
        localStorage.removeItem('token')
      }
    }
    
    checkAuth()
    // Update user when storage changes (other tabs) or when same-tab components dispatch userUpdated
    const handleStorage = (e) => {
      if (e.key === 'user') {
        const ud = localStorage.getItem('user')
        if (ud) {
          try {
            const userData = JSON.parse(ud)
            setUser(userData)
            setIsAuthenticated(true)
            console.log('Header: updated from storage', userData.username)
          } catch (err) {
            console.error('Header: failed to parse user data from storage', err)
            setUser(null)
            setIsAuthenticated(false)
          }
        } else {
          setUser(null)
          setIsAuthenticated(false)
          console.log('Header: user data cleared from storage')
        }
      }
    }
    
    const handleUserUpdated = (e) => {
      const detail = e?.detail
      if (detail) {
        setUser(detail)
        setIsAuthenticated(true)
        console.log('Header: user updated via event', detail.username)
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('userUpdated', handleUserUpdated)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('userUpdated', handleUserUpdated)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/auth'
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const isActive = (path) => {
    return pathname === path ? 'active' : ''
  }

  const navLinks = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/insights', label: 'Insights', icon: 'lightbulb' },
    { href: '/reading', label: 'Readings', icon: 'id-card' },
    { href: '/decks', label: 'Decks', icon: 'layer-group' },
    { href: '/settings', label: 'Settings', icon: 'cog' }
  ]

  // Hide header on auth pages (sign-in / register / oauth callbacks)
  if (typeof pathname === 'string' && pathname.startsWith('/auth')) {
    return null
  }

  return (
    <header className="bg-primary shadow-sm">
      <nav className="navbar navbar-expand-lg navbar-dark">
        <div className="container">
          {/* Brand */}
          <Link className="navbar-brand d-flex align-items-center" href="/" onClick={closeMenu}>
            <Image 
              src="/images/logo.png" 
              alt="My Tarot Readings" 
              width={400}
              height={200} /* doubled to twice previous size */
              priority
              className="site-logo"
              style={{ height: 'auto', objectFit: 'contain' }}
            />
          </Link>

          {/* Mobile menu button */}
          <button
            className="navbar-toggler border-0"
            type="button"
            onClick={toggleMenu}
            aria-controls="navbarNav"
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Navigation Links */}
          <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`} id="navbarNav">
            {mounted && isAuthenticated ? (
              <>
                <ul className="navbar-nav ms-auto">
                  {navLinks.map((link) => (
                    <li key={link.href} className="nav-item">
                      <Link
                        className={`nav-link ${isActive(link.href)}`}
                        href={link.href}
                        onClick={closeMenu}
                      >
                        {pathname === link.href ? <span className="me-1">🌗</span> : null}
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* User avatar on the right (clickable to settings) */}
                <div className="d-flex align-items-center ms-3">
                  <Link href="/settings" onClick={closeMenu} title="Account settings" style={{ display: 'inline-block' }}>
                    {
                      (() => {
                        // choose the best available variant
                        const rawImg = user?.profilePictureThumb || user?.profilePictureSmall || user?.profilePicture

                        // Normalize relative /uploads/... paths to the API host so the browser requests the correct server
                        const normalize = (src) => {
                          if (!src) return null
                          try {
                            // If it's already absolute, return as-is
                            const u = new URL(src)
                            if (u.protocol && u.hostname) return src
                          } catch (e) {
                            // not absolute
                          }
                          // If it's a relative uploads path like /uploads/..., prefix with API base
                          if (src.startsWith('/uploads/')) {
                            const raw = process.env.NEXT_PUBLIC_API_URL || ''
                            const apiBase = raw.replace(/\/api\/?$/i, '').replace(/\/$/, '') || window.location.origin
                            return `${apiBase}${src}`
                          }
                          return src
                        }

                        const imgSrc = normalize(rawImg)

                        // Render image only when a source exists and it hasn't errored. If it errors, show the placeholder div
                        if (imgSrc && !avatarError) {
                          return (
                            <SmartImage
                              src={imgSrc}
                              alt=""
                              sizes="36px"
                              width={36}
                              height={36}
                              className={`avatar-transition ${avatarLoaded ? 'loaded' : ''}`}
                              style={{ borderRadius: '50%', objectFit: 'cover' }}
                            />
                          )
                        }

                        return (
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                        )
                      })()
                    }
                  </Link>
                </div>
              </>
            ) : mounted ? (
              // Show sign in link when not authenticated (only after mount)
              <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                  <Link className="nav-link" href="/auth" onClick={closeMenu}>
                    Sign In
                  </Link>
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  )
}
