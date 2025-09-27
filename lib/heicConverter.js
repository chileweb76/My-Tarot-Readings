/**
 * Client-side HEIC to JPEG conversion utility
 * Uses heic2any library for reliable HEIC conversion
 */

export async function ensurePreviewableImage(file) {
  // If not a HEIC file, return original
  const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')
  if (!isHeic) {
    const url = URL.createObjectURL(file)
    return { file, previewUrl: url }
  }

  try {
    // Dynamic import to avoid SSR issues
    const { default: heic2any } = await import('heic2any')
    
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8
    })
    
    console.log('✅ HEIC conversion successful:', convertedBlob)
    
    // Create a new File object from the converted blob
    const convertedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now()
    })
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(convertedBlob)
    
    return { 
      file: convertedFile, 
      previewUrl 
    }
  } catch (error) {
    // Fallback: return original file with object URL for preview attempt
    try {
      const previewUrl = URL.createObjectURL(file)
      return { file, previewUrl }
    } catch (e) {
      return { file, previewUrl: null }
    }
  }
}
