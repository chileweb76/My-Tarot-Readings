// Lightweight fetch wrapper that retries once using refresh token when receiving 401
export async function apiFetch(url, options = {}) {
  // Allow overriding with NEXT_PUBLIC_API_URL in env. If not provided, fall
  // back to localhost for local development.
  const rawEnv = process.env.NEXT_PUBLIC_API_URL
  // If the env var is present but missing a protocol, assume https and prepend it.
  const normalizedEnv = rawEnv && !/^https?:\/\//i.test(rawEnv) ? `https://${rawEnv}` : rawEnv
  const raw = normalizedEnv || 'http://localhost:5000'
  const apiBase = raw.replace(/\/$|\/api$/i, '')

  // If running in the browser on a non-localhost host (e.g. Vercel) and the
  // environment variable wasn't provided, fail fast with a clear message.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (!rawEnv && host !== 'localhost' && host !== '127.0.0.1') {
      // Helpful error so the deployed client doesn't attempt to hit localhost
      // and return an empty HTML page which causes JSON parsing errors.
      throw new Error(
        'Missing NEXT_PUBLIC_API_URL: set NEXT_PUBLIC_API_URL in your Vercel project Environment Variables to the API URL (e.g. https://api.example.com)'
      )
    }
  }

  // Normalize relative paths: if the caller passes "/auth/..." or "/querents"
  // or any path that doesn't already begin with "/api", prefix it with "/api".
  // Absolute URLs (http/https) are left untouched.
  let path = url
  if (!url.startsWith('http')) {
    if (url.startsWith('/')) {
      if (!url.startsWith('/api')) path = '/api' + url
    } else {
      // no leading slash, assume a relative API path
      path = '/api/' + url
    }
  }

  const full = url.startsWith('http') ? url : `${apiBase}${path}`

  // Optional client-side debug: when DEBUG_API is set (in env), log outgoing
  // requests so we can confirm exactly what the browser is calling.
  try {
    const debug = process.env.DEBUG_API
    if (typeof window !== 'undefined' && debug) {
      // eslint-disable-next-line no-console
      console.info('[apiFetch] ->', (options.method || 'GET').toUpperCase(), full)
    }
  } catch (e) {}

  // Helpful debug output when developing: show how the final URL is built.
  try {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[apiFetch] apiBase=', apiBase, 'path=', path, 'full=', full)
    }
  } catch (e) {
    // ignore
  }

  const token = localStorage.getItem('token')
  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  // Provide a convenient fallback header for server routes that accept x-user-id
  // (some routes rely on this when session/JWT aren't being used in dev)
  try {
    const rawUser = localStorage.getItem('user')
    if (rawUser) {
      const user = JSON.parse(rawUser)
      const userId = user && (user.id || user._id || user._id?.toString())
      if (userId) headers.set('x-user-id', userId)
    }
  } catch (e) {
    // ignore malformed user in localStorage
  }

  const fetchOptions = { 
    credentials: 'omit', // Change from 'include' to 'omit' to avoid CORS credential issues
    ...options, 
    headers 
  }
  let res = await fetch(full, fetchOptions)
  if (res.status !== 401) return res

  // Try refresh once
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return res
  try {
  const rawRefresh = await fetch(`${apiBase}/api/auth/refresh`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ refreshToken }),
    credentials: 'omit' // Remove credentials to avoid CORS issues
  })
    if (!rawRefresh.ok) return res
    const data = await rawRefresh.json()
    if (data.token) {
      localStorage.setItem('token', data.token)
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
  // retry original request with new token (preserve credentials)
  headers.set('Authorization', `Bearer ${data.token}`)
  const retryOptions = { ...fetchOptions, headers }
  res = await fetch(full, retryOptions)
      return res
    }
  } catch (e) {
    console.warn('Token refresh failed', e)
  }
  return res
}

// Safe JSON parser: attempts to parse JSON and returns null on empty body
// or non-JSON responses. Callers should check `res.ok` and fall back to
// a useful error message if parsing fails.
export async function parseJsonSafe(res) {
  try {
    const text = await res.text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch (e) {
      // Return raw text under a reserved key so callers can show server messages
      return { __rawText: text }
    }
  } catch (e) {
    // Not JSON or truncated/empty response
    return null
  }
}

// Utility to handle Vercel Blob upload responses
export function extractBlobUrl(uploadResponse) {
  if (!uploadResponse) return null
  
  // Vercel Blob typically returns { url, downloadUrl, pathname, contentType, contentDisposition }
  // But our server might wrap it or return different formats
  return uploadResponse.url || 
         uploadResponse.downloadUrl || 
         uploadResponse.image || 
         uploadResponse.blob?.url ||
         uploadResponse.deck?.image ||
         uploadResponse.spread?.image ||
         uploadResponse.reading?.image ||
         null
}

// Check if a URL is a Vercel Blob URL
export function isBlobUrl(url) {
  if (!url || typeof url !== 'string') return false
  return url.includes('blob.vercel-storage.com') || url.includes('vercel-storage.com')
}

// Add metadata for Vercel Blob uploads
export function prepareBlobUpload(formData, options = {}) {
  // Add Vercel Blob specific metadata
  if (options.contentType) {
    formData.append('contentType', options.contentType)
  }
  
  if (options.filename) {
    formData.append('filename', options.filename)
  }
  
  // Add cache control for better performance
  formData.append('cacheControl', options.cacheControl || 'public, max-age=31536000')
  
  return formData
}
