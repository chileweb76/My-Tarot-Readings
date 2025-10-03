"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// This portal ensures toasts are rendered into a dedicated container appended to
// document.body with aggressive inline positioning and z-index so they cannot be
// hidden by header stacking contexts or other overlays.
export default function ToastPortal({ children }) {
  const [container, setContainer] = useState(null)

  useEffect(() => {
    const id = 'app-toast-root'
    let el = document.getElementById(id)
    let created = false
    if (!el) {
      el = document.createElement('div')
      el.id = id
      // Inline styles to guarantee stacking above virtually any header/overlay
      Object.assign(el.style, {
        position: 'fixed',
        top: '0px',
        right: '0px',
        width: '100%',
        pointerEvents: 'none',
        zIndex: String(2147483647), // Max 32-bit signed int
      })
      document.body.appendChild(el)
      created = true
    }
    setContainer(el)

    return () => {
      setContainer(null)
      if (created && el && el.parentNode) el.parentNode.removeChild(el)
    }
  }, [])

  if (!container) return null
  return createPortal(
    // Ensure children can receive pointer events even though the container blocks them by default
    <div style={{ pointerEvents: 'auto' }}>{children}</div>,
    container
  )
}
