"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { transformImageUrl, IMAGE_TYPES } from '../lib/imageService'

// SmartImage wraps Next.js Image and provides automatic image URL transformation
// via backend APIs, with fallback behavior for failed loads
export default function SmartImage({ 
  src, 
  alt = '', 
  className, 
  style, 
  width, 
  height, 
  fill, 
  sizes, 
  priority, 
  objectFit = 'cover', 
  onLoadingComplete, 
  onError,
  // New props for image service integration
  imageType = IMAGE_TYPES.STATIC,
  imageContext = {},
  enableTransform = true
}) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function updateImageSrc() {
      if (!src) {
        setCurrentSrc(src)
        return
      }

      // If transform is disabled, use src as-is
      if (!enableTransform) {
        setCurrentSrc(src)
        return
      }

      // If src is already a full HTTP URL (including blob URLs), use it directly
      if (typeof src === 'string' && (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:'))) {
        setCurrentSrc(src)
        return
      }

      setLoading(true)
      setError(false)

      try {
        const transformedSrc = await transformImageUrl(src, imageType, imageContext)
        setCurrentSrc(transformedSrc)
      } catch (err) {
        console.error('Failed to transform image URL:', err)
        setCurrentSrc(src) // Fallback to original
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    updateImageSrc()
  }, [src, imageType, imageContext, enableTransform])

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
      setError(true)
    } catch (err) {
      // ignore and keep currentSrc unchanged
    }
    if (onError) onError()
  }

  // Show loading state while transforming URL
  if (loading) {
    return (
      <div 
        className={`d-flex align-items-center justify-content-center ${className || ''}`}
        style={{ 
          width: fill ? '100%' : width, 
          height: fill ? '100%' : height, 
          backgroundColor: '#f8f9fa',
          ...style 
        }}
      >
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">Loading image...</span>
        </div>
      </div>
    )
  }

  // For blob URLs, use regular img tag instead of Next.js Image
  if (currentSrc?.startsWith('blob:')) {
    if (fill) {
      return (
        <img
          src={currentSrc}
          alt={alt}
          className={className}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            objectFit: objectFit,
            ...style 
          }}
          onLoad={() => onLoadingComplete && onLoadingComplete()}
          onError={handleError}
        />
      )
    }
    
    return (
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        style={{ 
          objectFit: objectFit,
          width: width || '100%',
          height: height || 'auto',
          ...style 
        }}
        onLoad={() => onLoadingComplete && onLoadingComplete()}
        onError={handleError}
      />
    )
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
        onLoadingComplete={onLoadingComplete}
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
      onLoadingComplete={onLoadingComplete}
    />
  )
}