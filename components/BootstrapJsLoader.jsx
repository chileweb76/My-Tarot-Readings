'use client'

import { useEffect } from 'react'

export default function BootstrapJsLoader() {
  useEffect(() => {
    // Dynamically import bootstrap JS (bundle) from node_modules
    // so we don't rely on external CDNs for JS.
    import('bootstrap/dist/js/bootstrap.bundle.min.js').catch(err => {
      // Fallback: ignore if loading fails
      // console.warn('Failed to load bootstrap JS:', err)
    })
  }, [])

  return null
}
