'use client'

import { useEffect, useState } from 'react'

export default function SpreadsDropdown() {
  const [spreads, setSpreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchSpreads() {
      try {
        const res = await fetch('/api/spreads')
        if (!res.ok) throw new Error('Failed to fetch spreads')
        const data = await res.json()
        setSpreads(data)
      } catch (e) {
        setError(e.message || 'Error fetching spreads')
      } finally {
        setLoading(false)
      }
    }
    fetchSpreads()
  }, [])

  return (
    <li className="nav-item dropdown ms-2">
      <a
        className="nav-link dropdown-toggle"
        href="#"
        id="spreadsDropdown"
        role="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        style={{ color: 'white', fontWeight: 600 }}
      >
        Spreads
      </a>
      <ul className="dropdown-menu" aria-labelledby="spreadsDropdown">
        {loading && <li className="dropdown-item text-muted">Loading...</li>}
        {error && <li className="dropdown-item text-danger">{error}</li>}
        {!loading && !error && spreads.length === 0 && (
          <li className="dropdown-item text-muted">No spreads found</li>
        )}
        {!loading && !error && spreads.map((spread) => (
          <li key={spread._id || spread.spread}>
            <a className="dropdown-item" href="#" tabIndex={-1}>
              {spread.spread}
            </a>
          </li>
        ))}
      </ul>
    </li>
  )
}
