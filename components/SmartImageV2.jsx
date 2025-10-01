"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { transformImageUrl, IMAGE_TYPES } from '../lib/imageServiceV3'

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
  const [currentSrc, setCurrentSrc] = useState(src || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('SmartImageV2: Received props - src:', src, 'alt:', alt, 'enableTransform:', enableTransform);
  }

  useEffect(() => {
    async function updateImageSrc() {
      // Handle null, undefined, or empty src
      if (!src || src === '' || src === null || src === undefined) {
        console.log('🟡 SmartImageV2: No valid src provided, using fallback')
        const fallbackSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#f8f9fa"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c757d" font-family="Arial, sans-serif" font-size="16">No image</text></svg>`
        )
        setCurrentSrc(fallbackSvg)
        setError(true)
        return
      }

      // If transform is disabled, use src as-is
      if (!enableTransform) {
        setCurrentSrc(src)
        return
      }

      // If src is already a full HTTP URL, handle appropriately
      if (typeof src === 'string' && (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:'))) {
        // For Vercel blob URLs, try direct access first (they should be public)
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
      
      // Prevent infinite loops by checking if we've already tried fallbacks
      if (error || url.startsWith('data:image/svg+xml') || url.includes('/api/image-proxy')) {
        console.log('🔴 SmartImageV2: Image failed permanently, using fallback SVG:', url)
        // Already in error state or tried proxy, use final fallback
        const fallbackSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#f8f9fa"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c757d" font-family="Arial, sans-serif" font-size="16">Image unavailable</text></svg>`
        )
        setCurrentSrc(fallbackSvg)
        setError(true)
        if (onError) onError()
        return
      }
      
      // If it's a blob URL that failed, try the proxy first (only once)
      if (url.includes('blob.vercel-storage.com')) {
        console.log('🟡 SmartImageV2: Blob URL failed, trying proxy:', url)
        setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(url)}`)
        setError(false) // Reset error state to try proxy
        return
      }
      
      // Try to extract a valid filename from the URL
      const parts = url.split('/')
      const file = parts[parts.length - 1] || ''
      
      let fallback = ''
      
      // If the URL contains an /images/ path, use it directly
      const idx = url.indexOf('/images/')
      if (idx !== -1) {
        fallback = url.slice(idx)
      } else if (file && file !== '/' && file.length > 0 && !file.includes('?')) {
        // Only create fallback if we have a valid filename
        fallback = '/images/rider-waite-tarot/' + file
      }
      
      // Validate the fallback URL is reasonable
      if (!fallback || fallback === '/images/rider-waite-tarot/' || fallback.endsWith('/')) {
        console.log('🔴 SmartImageV2: No valid fallback URL, using SVG for:', url)
        fallback = 'data:image/svg+xml;utf8,' + encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#f8f9fa"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c757d" font-family="Arial, sans-serif" font-size="16">Image unavailable</text></svg>`
        )
      }
      
      console.log('🟡 SmartImageV2: Using fallback URL:', fallback)
      setCurrentSrc(fallback)
      setError(true)
    } catch (err) {
      console.error('🔴 SmartImageV2: Error in handleError:', err)
      // Use final fallback SVG
      const fallbackSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#f8f9fa"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c757d" font-family="Arial, sans-serif" font-size="16">Image unavailable</text></svg>`
      )
      setCurrentSrc(fallbackSvg)
      setError(true)
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

  // For blob URLs and external HTTP URLs, use regular img tag instead of Next.js Image
  if (currentSrc?.startsWith('blob:') || (currentSrc?.startsWith('http') && currentSrc.includes('vercel-storage.com'))) {
    if (process.env.NODE_ENV === 'development') {
      console.log('SmartImageV2: Using img tag for blob/external URL:', currentSrc);
    }
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

  // Helper: determine if we should avoid Next.js optimization for this URL
  const shouldSkipOptimization = (url) => {
    if (!url) return false
    try {
      const u = new URL(url)
      const host = u.hostname || ''
      // Skip optimization for Vercel Blob hosts or same-origin / vercel.app hosts
      // Avoid accessing `window` during SSR by guarding with typeof window
      if (
        host.endsWith('vercel-storage.com') ||
        (typeof window !== 'undefined' && host === window.location.hostname) ||
        host.endsWith('.vercel.app')
      ) {
        return true
      }
    } catch (e) {
      // if URL constructor fails, don't skip
    }
    return false
  }

  // If fill is requested, use the fill prop and require a positioned container.
  if (fill) {
    if (process.env.NODE_ENV === 'development') {
      console.log('SmartImageV2: Using Next/Image with unoptimized for:', currentSrc);
    }
    return (
      <Image
        src={currentSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={shouldSkipOptimization(currentSrc)}
        style={{ objectFit: objectFit, ...style }}
        className={className}
        onError={handleError}
        onLoadingComplete={onLoadingComplete}
      />
    )
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('SmartImageV2: Using Next/Image with unoptimized for:', currentSrc);
  }
  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      unoptimized={shouldSkipOptimization(currentSrc)}
      style={{ objectFit: objectFit, ...style }}
      className={className}
      onError={handleError}
      onLoadingComplete={onLoadingComplete}
    />
  )
}