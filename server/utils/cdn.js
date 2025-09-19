// server/utils/cdn.js
// Simple CommonJS helper to normalize image paths to local `/images/...` paths.
// This replaces the previous CDN-mapping behavior so the server always writes
// or returns local image paths by default.

function cdnUrl(relPath) {
  if (!relPath || typeof relPath !== 'string') return relPath
  // If it already contains /images/ return from that point
  const idx = relPath.indexOf('/images/')
  if (idx !== -1) return relPath.slice(idx)
  // If it looks like images/... ensure leading slash
  if (relPath.startsWith('images/')) return '/' + relPath
  // If it's already an absolute path, just return it
  if (relPath.startsWith('/')) return relPath
  // Otherwise prefix with /
  return '/' + relPath
}

module.exports = { cdnUrl }
