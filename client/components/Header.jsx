'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'


export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [avatarLoaded, setAvatarLoaded] = useState(true)
  const [avatarError, setAvatarError] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    }
    // update user when storage changes (other tabs) or when same-tab components dispatch userUpdated
    const handleStorage = (e) => {
      if (e.key === 'user') {
        const ud = localStorage.getItem('user')
        setUser(ud ? JSON.parse(ud) : null)
        setIsAuthenticated(!!localStorage.getItem('token'))
      }
    }
    const handleUserUpdated = (e) => {
      const detail = e?.detail
      if (detail) {
        setUser(detail)
        setIsAuthenticated(!!localStorage.getItem('token'))
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
          <a className="navbar-brand d-flex align-items-center" href="/" onClick={closeMenu}>
            <Image 
              src="/images/logo.png" 
              alt="My Tarot Readings" 
              width={150}
              height={50}
              priority
            />
          </a>

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
            {isAuthenticated && (
              <>

                <ul className="navbar-nav ms-auto">
                  {navLinks.map((link) => (
                    <li key={link.href} className="nav-item">
                      <a
                        className={`nav-link ${isActive(link.href)}`}
                        href={link.href}
                        onClick={closeMenu}
                      >
                        {pathname === link.href ? <span className="me-1">🌗</span> : null}
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>

                {/* User avatar on the right (clickable to settings) */}
                <div className="d-flex align-items-center ms-3">
                  <a href="/settings" onClick={closeMenu} title="Account settings" style={{ display: 'inline-block' }}>
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
                            <img
                              key={imgSrc}
                              src={imgSrc}
                              alt="" /* intentionally blank to avoid rendering the user's name when image fails */
                              aria-label={user?.username || 'Account'}
                              onLoad={() => {
                                setAvatarLoaded(true)
                                setAvatarError(false)
                              }}
                              onError={() => {
                                setAvatarLoaded(true)
                                setAvatarError(true)
                              }}
                              className={`avatar-transition ${avatarLoaded ? 'loaded' : ''}`}
                              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                            />
                          )
                        }

                        return (
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                        )
                      })()
                    }
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
