const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const spreadsPath = path.join(repoRoot, 'public', 'spreads.json')
const mappingPath = path.join(repoRoot, 'blob-url-mapping.json')

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

const spreads = readJson(spreadsPath)
const mapping = readJson(mappingPath)

const spreadsMap = mapping.spreads || {}
const spreadMappings = mapping.spreadMappings || {}

const slugify = (name) => name && name.toString().trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g,'-').replace(/^-|-$/g,'')
const titleCase = (s) => s && s.toString().split(/\s+/).map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ')

const results = spreads.map(sp => {
  const name = sp.spread
  const img = sp.image
  const idCandidates = Object.keys(spreadMappings).filter(k => spreadMappings[k] === name)

  const candidates = []
  candidates.push(name)
  if (idCandidates.length) candidates.push(...idCandidates)
  const slug = slugify(name)
  if (slug) {
    candidates.push(`/images/spreads/${slug}.png`)
    candidates.push(`/spreads/${slug}.png`)
    candidates.push(slug + '.png')
    candidates.push(slug)
  }
  candidates.push(titleCase(name))

  // dedupe
  const uniq = [...new Set(candidates.filter(Boolean))]

  // find first matching key in spreadsMap or spreadMappings
  let matched = null
  let matchedKey = null
  for (const key of uniq) {
    if (spreadsMap[key]) {
      matched = spreadsMap[key]
      matchedKey = key
      break
    }
    if (spreadMappings[key]) {
      // spreadMappings maps id->displayName; we want the blob URL: check spreadsMap for the display name key
      const maybe = spreadsMap[spreadMappings[key]] || spreadsMap[`/images/spreads/${slugify(spreadMappings[key])}.png`]
      if (maybe) {
        matched = maybe
        matchedKey = key
        break
      }
    }
  }

  // Also, if img is already a full HTTP blob URL, we can use that as the canonical value
  const imgIsBlob = typeof img === 'string' && img.startsWith('http')

  return {
    spread: name,
    imageFromSpreadsJson: img,
    mappingFound: !!matched,
    matchedKey: matchedKey,
    mappedUrl: matched || (imgIsBlob ? img : null),
    suggestedMappingKeys: uniq,
    notes: matched ? 'OK' : (imgIsBlob ? 'spreads.json contains full blob URL (can add mapping for candidates)' : 'No blob URL found; needs upload/mapping')
  }
})

// Results output removed for production
