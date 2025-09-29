'use client'

import { useEffect, useState } from 'react'
import { getSpreadsAction } from '../lib/actions'

export default function SpreadSelect({ value, onChange, className, style }) {
  const [spreads, setSpreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const result = await getSpreadsAction()
        if (result.success) {
          if (mounted) setSpreads(result.data)
        } else {
          throw new Error(result.error)
        }
      } catch (e) {
        if (mounted) setError(e.message || 'Error')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const onUpdated = () => { setLoading(true); load() }
    window.addEventListener('spreadsUpdated', onUpdated)
    return () => { 
      mounted = false
      window.removeEventListener('spreadsUpdated', onUpdated)
    }
  }, [])

  return (
    <div className={className} style={style}>
      <label htmlFor="spreadSelect" className="form-label mb-0">Spread</label>
      <select
        id="spreadSelect"
        className="form-select"
        style={{ width: 320 }}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
      >
        {loading && <option>Loading...</option>}
        {error && <option>{error}</option>}
        {!loading && !error && (
          <>
            <option value="">-- Select spread --</option>
            {spreads.map((s) => (
              <option key={s._id || s.spread} value={s._id || s.spread}>{s.spread}</option>
            ))}
          </>
        )}
      </select>
    </div>
  )
}
