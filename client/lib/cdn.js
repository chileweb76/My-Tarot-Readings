// client/lib/cdn.js
// Client-side helper to strip absolute/CDN URLs back to local `/images/...` paths
// and provide a no-op `cdnUrl` for parity with the server helper.

export function stripCdnToLocal(url) {
  if (!url || typeof url !== 'string') return url
  try {
    // If contains /images/ return that substring
    const idx = url.indexOf('/images/')
    if (idx !== -1) return url.slice(idx)

    // If it looks like a client/public path, convert to /images/...
    const idx2 = url.indexOf('/client/public')
    if (idx2 !== -1) {
      return url.slice(idx2 + '/client/public'.length)
    }

    // If the url is just a filename with rider-waite hint, map to the rider folder
    if (url.includes('rider-waite-tarot')) {
      const parts = url.split('/')
      const file = parts[parts.length - 1] || ''
      if (file) return '/images/rider-waite-tarot/' + file
    }

    // If it's already a relative images path
    if (url.startsWith('images/')) return '/' + url

    // Otherwise return as-is (let the browser try it)
    return url
  } catch (err) {
    return url
  }
}

export function cdnUrl(relPath) {
  // No-op on the client; return normalized local path
  if (!relPath || typeof relPath !== 'string') return relPath
  if (relPath.indexOf('/images/') !== -1) return relPath.slice(relPath.indexOf('/images/'))
  if (relPath.startsWith('images/')) return '/' + relPath
  if (relPath.startsWith('/')) return relPath
  return '/' + relPath
}

export default { stripCdnToLocal, cdnUrl }
