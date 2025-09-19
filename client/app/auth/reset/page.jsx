'use client'

import { useState } from 'react'
import AuthWrapper from '../../../components/AuthWrapper'
import { apiFetch } from '../../../lib/api'
import { notify } from '../../../lib/toast'

export default function ResetPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiFetch('/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      notify({ type: 'success', text: data.message || 'If that email exists, a reset link has been sent.' })
    } catch (err) {
      notify({ type: 'error', text: err.message || 'Failed to request reset' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthWrapper>
      <form onSubmit={handleSubmit} className="p-3">
        <h3>Reset password</h3>
        <div className="mb-2">
          <label className="form-label">Email</label>
          <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <button className="btn btn-tarot-primary" disabled={loading}>{loading ? 'Sending...' : 'Send reset'}</button>
        </div>
      </form>
    </AuthWrapper>
  )
}
