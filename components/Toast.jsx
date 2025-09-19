import { useEffect } from 'react'

export default function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(t)
  }, [message, duration, onClose])

  if (!message) return null

  const variant = message.type === 'error' ? 'error' : (message.type === 'success' ? 'success' : 'neutral')

  return (
    <div className="app-toast-wrapper" role="status" aria-live="polite">
      <div className={`app-toast app-toast--${variant}`}>
        <div className="app-toast__body">{message.text}</div>
        <button aria-label="Close" className="app-toast__close" onClick={onClose}>&times;</button>
      </div>
    </div>
  )
}
