"use client"

import { usePathname } from 'next/navigation'

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
        <div>My Tarot Readings</div>
      </div>
    </footer>
  )
}
