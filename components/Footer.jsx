"use client"

import { usePathname } from 'next/navigation'
import Image from 'next/image'

export default function Footer() {
  const pathname = usePathname()

  // Hide footer on auth pages (same as header behavior)
  if (typeof pathname === 'string' && pathname.startsWith('/auth')) {
    return null
  }

  return (
    <footer className="navbar navbar-dark shadow-sm" role="contentinfo">
      <div className="container py-3 d-flex justify-content-between align-items-center">
        <div>&copy; 2025 Christopher Hile</div>
        <div className="site-logo--small" style={{ width: 80, height: 28 }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Image src="/images/small-logo.png" alt="My Tarot Readings" fill style={{ objectFit: 'contain', display: 'block' }} />
          </div>
        </div>
      </div>
    </footer>
  )
}
