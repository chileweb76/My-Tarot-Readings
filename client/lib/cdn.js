/**
 * CDN helper for client assets using jsDelivr + GitHub (gh) endpoint.
 *
 * Usage:
 *   import { cdnUrl } from '../lib/cdn'
 *   const src = cdnUrl('/images/rider-waite-tarot/major_arcana_world.png')
 *
 * Environment / .env:
 *   NEXT_PUBLIC_CDN_ENABLE=true
 *   NEXT_PUBLIC_CDN_OWNER=chileweb76
 *   NEXT_PUBLIC_CDN_REPO=My-Tarot-Readings
 *   NEXT_PUBLIC_CDN_TAG=main   # optional (defaults to main)
 */

// Default CDN base points to your jsDelivr gh repo mirror. Can be overridden by
// setting NEXT_PUBLIC_CDN_BASE in .env.local or your hosting environment.
const CDN_BASE = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CDN_BASE) || 'https://cdn.jsdelivr.net/gh/chileweb76/mytarotreadings-cdn'
const ENABLE = (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_CDN_ENABLE === 'true')) || false
const OWNER = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CDN_OWNER) || ''
const REPO = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CDN_REPO) || ''
const TAG = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CDN_TAG) || 'main'

function normalizeRelPath(relPath) {
  if (!relPath) return relPath
  // ensure it starts with /
  if (!relPath.startsWith('/')) relPath = '/' + relPath
  return relPath
}

/**
 * Return a CDN URL for repo-hosted public images, otherwise return the original path.
 * Only maps paths under `/images/` to `client/public/images/...` in the repo so they
 * can be served by jsDelivr. Uploads (`/uploads/`) or runtime-generated files are
 * not mapped and will be returned unchanged.
 */
export function cdnUrl(relPath) {
  relPath = normalizeRelPath(relPath)
  if (!ENABLE) return relPath

  // Only map files under /images/ (these live in client/public/images in the repo)
  if (relPath.startsWith('/images/')) {
    // repo path should point to the file in the repository, e.g. client/public/images/...
    const repoPath = `client/public${relPath}`.replace(/^\/+/, '')

    // If the CDN base already contains a /gh/ path (e.g. your provided base), just
    // append the repoPath. Otherwise, construct a /gh/ path using OWNER/REPO/TAG.
    const base = CDN_BASE.replace(/\/+$/, '')
    if (base.includes('/gh/')) {
      return `${base}/${repoPath}`
    }

    if (OWNER && REPO) {
      return `${base}/gh/${OWNER}/${REPO}@${TAG}/${repoPath}`
    }

    // Not enough info to build CDN URL; fall back to local path
    return relPath
  }

  // For anything else (uploads, api served files), return original path
  return relPath
}

export default cdnUrl
