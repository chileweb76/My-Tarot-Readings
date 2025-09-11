/**
 * Server-side CDN helper to build jsDelivr/GH URLs for files under client/public/images
 * Mirrors the client-side helper in client/lib/cdn.js so DB entries can point at the CDN.
 */
const path = require('path')

const CDN_BASE = process.env.NEXT_PUBLIC_CDN_BASE || process.env.CDN_BASE || 'https://cdn.jsdelivr.net/gh/chileweb76/mytarotreadings-cdn'
const ENABLE = (process.env.NEXT_PUBLIC_CDN_ENABLE === 'true') || (process.env.CDN_ENABLE === 'true') || false
const OWNER = process.env.NEXT_PUBLIC_CDN_OWNER || process.env.CDN_OWNER || ''
const REPO = process.env.NEXT_PUBLIC_CDN_REPO || process.env.CDN_REPO || ''
const TAG = process.env.NEXT_PUBLIC_CDN_TAG || process.env.CDN_TAG || 'main'

function normalizeRelPath(relPath) {
  if (!relPath) return relPath
  if (!relPath.startsWith('/')) relPath = '/' + relPath
  return relPath
}

function cdnUrl(relPath) {
  relPath = normalizeRelPath(relPath)
  if (!ENABLE) return relPath

  if (relPath.startsWith('/images/')) {
    const repoPath = `client/public${relPath}`.replace(/^\/+/, '')
    const base = CDN_BASE.replace(/\/+$/, '')
    if (base.includes('/gh/')) return `${base}/${repoPath}`
    if (OWNER && REPO) return `${base}/gh/${OWNER}/${REPO}@${TAG}/${repoPath}`
    return relPath
  }
  return relPath
}

module.exports = { cdnUrl }
