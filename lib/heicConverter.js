// Client-side helper to convert HEIC/HEIF images to JPEG for preview and upload
// Uses browser decode APIs (createImageBitmap + canvas) when available. If the
// browser cannot decode HEIC, the original File is returned and a preview URL
// may not render in some browsers. This avoids bundling native node modules.
export async function ensurePreviewableImage(file) {
  if (!file) return { file: null, previewUrl: null }
  const name = file.name || 'image'
  const lower = (name || '').toLowerCase()
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || lower.endsWith('.heic') || lower.endsWith('.heif')
  if (!isHeic) {
    return { file, previewUrl: URL.createObjectURL(file) }
  }

  // Best-effort conversion using browser APIs. createImageBitmap will decode
  // many image formats if the browser supports them (including HEIF/HEIC on
  // some platforms). Draw to a canvas and export as JPEG.
  if (typeof createImageBitmap === 'function' && typeof document !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0)
      // Convert canvas to JPEG blob
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) throw new Error('Canvas toBlob returned null')
      const jpgName = (name.replace(/\.[^/.]+$/, '') || 'image') + '.jpg'
      const convertedFile = new File([blob], jpgName, { type: 'image/jpeg' })
      const url = URL.createObjectURL(convertedFile)
      try { bitmap.close && bitmap.close() } catch (e) {}
      return { file: convertedFile, previewUrl: url }
    } catch (err) {
      console.warn('Browser HEIC decode failed:', err)
      // Fall through to returning original file and an object URL; preview may fail.
    }
  }

  // Fallback: return original file (preview via object URL may or may not work)
  return { file, previewUrl: URL.createObjectURL(file) }
}
