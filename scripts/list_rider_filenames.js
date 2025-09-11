#!/usr/bin/env node
// Prints the canonical Rider-Waite filenames used by the project (78 cards)
// Usage: node scripts/list_rider_filenames.js

const filenames = []

// Major Arcana (canonical short names used in repo previously)
const major = [
  'major_arcana_fool.png',
  'major_arcana_magician.png',
  'major_arcana_priestess.png',
  'major_arcana_empress.png',
  'major_arcana_emperor.png',
  'major_arcana_hierophant.png',
  'major_arcana_lovers.png',
  'major_arcana_chariot.png',
  'major_arcana_strength.png',
  'major_arcana_hermit.png',
  'major_arcana_fortune.png',
  'major_arcana_justice.png',
  'major_arcana_hanged.png',
  'major_arcana_death.png',
  'major_arcana_temperance.png',
  'major_arcana_devil.png',
  'major_arcana_tower.png',
  'major_arcana_star.png',
  'major_arcana_moon.png',
  'major_arcana_sun.png',
  'major_arcana_judgement.png',
  'major_arcana_world.png'
]

// Minor Arcana helpers (suits and ranks)
function minorFilenames(suit, short) {
  const arr = []
  arr.push(`minor_arcana_${short}_ace.png`)
  for (let i = 2; i <= 10; i++) arr.push(`minor_arcana_${short}_${i}.png`)
  arr.push(`minor_arcana_${short}_page.png`)
  arr.push(`minor_arcana_${short}_knight.png`)
  arr.push(`minor_arcana_${short}_queen.png`)
  arr.push(`minor_arcana_${short}_king.png`)
  return arr
}

const wands = minorFilenames('wands','wands')
const cups = minorFilenames('cups','cups')
const swords = minorFilenames('swords','swords')
const pentacles = minorFilenames('pentacles','pentacles')

const all = [...major, ...wands, ...cups, ...swords, ...pentacles]

console.log('Total expected files:', all.length)
console.log(all.join('\n'))

module.exports = all
