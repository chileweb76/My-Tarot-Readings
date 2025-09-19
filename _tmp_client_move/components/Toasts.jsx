import { useEffect } from 'react'

// toasts: [{ id, text, type }]
export default function Toasts({ toasts = [], onRemove, duration = 4500 }) {
  useEffect(() => {
    if (!toasts || toasts.length === 0) return
    // set timers to auto-remove toasts
    const timers = toasts.map(t => {
      return setTimeout(() => onRemove(t.id), duration)
    })
    return () => timers.forEach(clearTimeout)
  }, [toasts, onRemove, duration])

  if (!toasts || !toasts.length) return null

  return (
    <div className="app-toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map(t => (
        <div key={t.id} className={`app-toast app-toast--${t.type || 'neutral'} app-toast--enter`}>
          <div className="app-toast__body">{t.text}</div>
          <button aria-label="Close" className="app-toast__close" onClick={() => onRemove(t.id)}>&times;</button>
        </div>
      ))}
    </div>
  )
}
