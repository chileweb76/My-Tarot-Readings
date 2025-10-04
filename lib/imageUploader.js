// Shared image preparation utilities used by CameraModal, Reading page, and Decks
export async function dataUrlToFile(dataUrl, filename = `capture-${Date.now()}.jpg`) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}

export async function getConfiguredImageLimitBytes() {
  try {
    let imageLimitMb = 5.0
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('IMAGE_SIZE_LIMIT_MB')
      if (v) imageLimitMb = parseFloat(v)
    }
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_IMAGE_SIZE_LIMIT_MB) {
      imageLimitMb = parseFloat(process.env.NEXT_PUBLIC_IMAGE_SIZE_LIMIT_MB)
    }
    return Math.round((imageLimitMb || 5.0) * 1024 * 1024)
  } catch (e) {
    return 5 * 1024 * 1024
  }
}

// Prepare an input (File or dataURL string) for upload. Returns { success, file, previewUrl, error }
export async function prepareImageForUpload(input, options = {}) {
  try {
    let file = null
    let previewUrl = null

    if (!input) return { success: false, error: 'No input provided' }

    if (typeof input === 'string') {
      // assume data URL
      file = await dataUrlToFile(input)
      previewUrl = input
    } else if (input instanceof File || (typeof Blob !== 'undefined' && input instanceof Blob)) {
      // File or Blob
      if (input instanceof Blob && !(input instanceof File)) {
        file = new File([input], options.filename || `capture-${Date.now()}.jpg`, { type: input.type || 'image/jpeg' })
      } else {
        file = input
      }
      try {
        previewUrl = URL.createObjectURL(file)
      } catch (e) {
        previewUrl = null
      }
    } else {
      return { success: false, error: 'Unsupported input type' }
    }

    // Attempt HEIC conversion if available
    try {
      const mod = await import('./heicConverter')
      if (mod && typeof mod.ensurePreviewableImage === 'function') {
        const converted = await mod.ensurePreviewableImage(file)
        file = converted.file || file
        previewUrl = converted.previewUrl || previewUrl
      }
    } catch (e) {
      // ignore if HEIC conversion isn't available or fails
      // HEIC conversion skipped
    }

    // Size validation
    const maxBytes = options.maxBytes || await getConfiguredImageLimitBytes()
    if (file.size > maxBytes) {
      return { success: false, error: `File too large (${(file.size/1024/1024).toFixed(2)}MB). Limit is ${(maxBytes/1024/1024).toFixed(2)}MB` }
    }

    return { success: true, file, previewUrl }
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : String(error) }
  }
}

const imageUploaderModule = { dataUrlToFile, prepareImageForUpload, getConfiguredImageLimitBytes }
export default imageUploaderModule
