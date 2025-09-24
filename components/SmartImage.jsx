"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'

// SmartImage wraps Next.js Image and provides a simple onError fallback
// behavior: if the provided src fails to load, compute a reasonable fallback
// (local /images path heuristics) or an inline SVG placeholder and update
// the displayed source.
export default function SmartImage({ src, alt = '', className, style, width, height, fill, sizes, priority, objectFit = 'cover' }) {
  const [currentSrc, setCurrentSrc] = useState(src)

  useEffect(() => {
    setCurrentSrc(src)
  }, [src])

  const handleError = () => {
    try {
      const url = currentSrc || ''
      // If the URL contains an /images/ path, use it directly
      const idx = url.indexOf('/images/')
      let fallback = ''
      if (idx !== -1) {
        fallback = url.slice(idx)
      } else {
        const parts = url.split('/')
        const file = parts[parts.length - 1] || ''
        if (file) fallback = '/images/rider-waite-tarot/' + file
      }
      if (!fallback) {
        fallback = 'data:image/svg+xml;utf8,' + encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#f8f9fa"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c757d" font-family="Arial, sans-serif" font-size="16">Image unavailable</text></svg>`
        )
      }
      setCurrentSrc(fallback)
    } catch (err) {
      // ignore and keep currentSrc unchanged
    }
  }

  // If fill is requested, use the fill prop and require a positioned container.
  if (fill) {
    return (
      <Image
        src={currentSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectFit: objectFit, ...style }}
        className={className}
        onError={handleError}
      />
    )
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      style={{ objectFit: objectFit, ...style }}
      className={className}
      onError={handleError}
    />
  )
}
