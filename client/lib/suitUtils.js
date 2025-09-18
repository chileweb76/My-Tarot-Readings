// Utility helpers for suit ordering and color mappings

// Preferred order: Major Arcana first, then common suits in this order
const PREFERRED_ORDER = ['Major Arcana', 'Cups', 'Wands', 'Swords', 'Pentacles']

const DEFAULT_COLOR = 'rgba(246, 200, 76, 0.9)'

const SUIT_COLOR_MAP = {
  // Use gold/amber for Major Arcana to make it stand out
  'Major Arcana': 'rgba(255, 205, 86, 0.95)',
  'Cups': 'rgba(54, 162, 235, 0.8)',
  'Wands': 'rgba(255, 159, 64, 0.8)',
  'Swords': 'rgba(75, 192, 192, 0.8)',
  'Pentacles': 'rgba(153, 102, 255, 0.8)'
}

function getSuitColor(label) {
  if (!label) return DEFAULT_COLOR
  for (const key of Object.keys(SUIT_COLOR_MAP)) {
    const re = new RegExp(key, 'i')
    if (re.test(label)) return SUIT_COLOR_MAP[key]
  }
  return DEFAULT_COLOR
}

// Given an object map of suitCounts { label: count }, return an ordered dataset
// object: { labels: [], data: [], colors: [] }
function buildSuitDataset(suitCounts) {
  const entries = Object.entries(suitCounts || {})
  if (!entries.length) return { labels: [], data: [], colors: [] }

  // Group entries into preferred and others
  const preferred = []
  const others = []
  for (const [label, count] of entries) {
    const idx = PREFERRED_ORDER.findIndex(pref => new RegExp(pref, 'i').test(label))
    if (idx !== -1) preferred.push({ label, count, idx })
    else others.push({ label, count })
  }

  // Sort preferred by the order in PREFERRED_ORDER
  preferred.sort((a, b) => a.idx - b.idx)
  // Sort others alphabetically
  others.sort((a, b) => a.label.localeCompare(b.label))

  const combined = [...preferred, ...others]
  const labels = combined.map(c => c.label)
  const data = combined.map(c => c.count)
  const colors = combined.map(c => getSuitColor(c.label))

  return { labels, data, colors }
}

module.exports = { getSuitColor, buildSuitDataset }
