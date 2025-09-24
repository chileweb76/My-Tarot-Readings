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
    <footer 
      className="footer" 
      role="contentinfo"
      style={{ 
        background: 'linear-gradient(90deg, #4a154b, #3a103a)', 
        backgroundColor: '#4a154b',
        boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
        marginTop: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        color: '#ffffff',
        position: 'relative',
        zIndex: 1000
      }}
    >
      <div className="container py-3 d-flex justify-content-between align-items-center" style={{ color: '#ffffff' }}>
        <div style={{ color: '#ffffff' }}>&copy; 2025 Christopher Hile</div>
        <div className="site-logo--small d-flex align-items-center" style={{ width: 100, height: 35 }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Image src="/images/small-logo.png" alt="My Tarot Readings" fill style={{ objectFit: 'contain', display: 'block', filter: 'brightness(2) contrast(2)' }} />
          </div>
        </div>
      </div>
    </footer>
  )
}
