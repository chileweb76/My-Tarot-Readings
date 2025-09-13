// Simple toast pub/sub helper. Components can import { notify, addListener, removeListener }
const listeners = new Set()

export function addListener(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function removeListener(fn) {
  listeners.delete(fn)
}

export function notify(msg) {
  // msg: { type, text } or string
  const payload = typeof msg === 'string' ? { type: 'neutral', text: msg } : msg || { type: 'neutral', text: '' }
  for (const fn of Array.from(listeners)) {
    try { fn(payload) } catch (e) { console.warn('Toast listener error', e) }
  }
}

export default { addListener, removeListener, notify }
