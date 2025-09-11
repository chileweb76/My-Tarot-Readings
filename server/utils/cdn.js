/**
 * CDN helper (disabled):
 * Historically this module mapped `/images/...` local paths to a CDN URL
 * (jsDelivr/GitHub). CDN support caused the app to attempt external fetches
 * when the CDN wasn't populated which broke image loading. To keep the app
 * serving local assets reliably, CDN mapping is intentionally disabled and
 * `cdnUrl()` is a no-op that returns a normalized local path.
 */

function normalizeRelPath(relPath) {
  if (!relPath) return relPath
  if (!relPath.startsWith('/')) relPath = '/' + relPath
  return relPath
}

function cdnUrl(relPath) {
  // CDN disabled: always return normalized local path
  return normalizeRelPath(relPath)
}

module.exports = { cdnUrl }
