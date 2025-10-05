"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// This portal ensures modals are rendered into a dedicated container appended to
// document.body so they appear above the header and all other page content
export default function ModalPortal({ children }) {
  const [container, setContainer] = useState(null)

  useEffect(() => {
    const id = 'app-modal-root'
    let el = document.getElementById(id)
    let created = false
    if (!el) {
      el = document.createElement('div')
      el.id = id
      // Inline styles to guarantee stacking above header but below toasts
      Object.assign(el.style, {
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: String(100001), // Above header, below toasts
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
    // Ensure children can receive pointer events
    <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>{children}</div>,
    container
  )
}
