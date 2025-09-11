"use client"

import { useEffect, useState } from 'react'
import AuthWrapper from '../components/AuthWrapper'
import { apiFetch } from '../lib/api'
import QuerentModal from '../components/QuerentModal'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [querents, setQuerents] = useState([])
  const [selectedQuerent, setSelectedQuerent] = useState('self')
  const [addingQuerent, setAddingQuerent] = useState(false)
  const [newQuerentName, setNewQuerentName] = useState('')
  const [savingQuerent, setSavingQuerent] = useState(false)

  useEffect(() => {
    // Try to read cached user data
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  // fetch querents when user is available
  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
        try {
        const res = await apiFetch('/querents')
        if (!res.ok) return
        const data = await res.json()
        if (data.querents) {
          setQuerents(data.querents)
        }
      } catch (err) {
        // ignore load errors silently
        console.warn('Failed to load querents', err)
      }
    }
    load()
  }, [user])

  return (
    <AuthWrapper>
      <div id="reading" className="reading">
        <p>Reading by: {user?.username || 'Guest'}</p>
        <h2>Reading</h2>

        <div className="mt-3 querent-row">
          <label htmlFor="querentSelect" className="form-label mb-0">Querent</label>
          <select
            id="querentSelect"
            className="form-select"
            style={{ width: 220 }}
            value={selectedQuerent}
            onChange={(e) => setSelectedQuerent(e.target.value)}
          >
            <option value="self">Self</option>
            {querents.map((q) => (
              <option key={q._id} value={q._id}>{q.name}</option>
            ))}
          </select>

          <button className="btn btn-tarot-primary btn-sm" id="addQuerentBtn" onClick={() => { setAddingQuerent(true); setNewQuerentName('') }}>Add</button>
        </div>
      </div>
    
      <QuerentModal
        show={addingQuerent}
        value={newQuerentName}
        onChange={(v) => setNewQuerentName(v)}
        loading={savingQuerent}
        onClose={() => { setAddingQuerent(false); setNewQuerentName('') }}
        onSave={async () => {
          const name = (newQuerentName || '').trim()
          if (!name) return alert('Name required')
          const token = localStorage.getItem('token')
          if (!token) { alert('Please sign in to save querents'); return }
          try {
            setSavingQuerent(true)
            const res = await apiFetch('/querents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            })
            if (!res.ok) {
              const err = await res.json().catch(() => ({}))
              throw new Error(err.error || 'Failed to save querent')
            }
            const data = await res.json()
            setQuerents(prev => [data.querent, ...prev])
            setSelectedQuerent(data.querent._id)
            setAddingQuerent(false)
            setNewQuerentName('')
          } catch (err) {
            alert('Error saving querent: ' + (err.message || err))
          } finally {
            setSavingQuerent(false)
          }
        }}
      />
    </AuthWrapper>
  )
}
