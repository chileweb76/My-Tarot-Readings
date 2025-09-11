'use client'

import { useState, useEffect } from 'react'

export default function ResetPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  const [mode, setMode] = useState('request') // 'request' or 'reset'
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [verifyPassword, setVerifyPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // if token provided in query string, switch to reset mode
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) {
      setToken(t)
      setMode('reset')
    }
  }, [])

  const handleRequest = async (e) => {
    e && e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`${API_URL}/auth/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to request reset')
      setMessage({ type: 'success', text: data.message || 'If that email exists, a reset link has been sent.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e && e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`${API_URL}/auth/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, verifyPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reset password')
      setMessage({ type: 'success', text: data.message || 'Password reset successful. You may sign in.' })
      // redirect to sign in after short delay
      setTimeout(() => { window.location.href = '/auth' }, 1800)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow auth-card">
            <div className="card-body p-5">
              <h3 className="text-center mb-4">Password Reset</h3>

              {message && (
                <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`} role="alert">
                  {message.text}
                </div>
              )}

              {mode === 'request' ? (
                <form onSubmit={handleRequest}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input type="email" className="form-control" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <button className="btn btn-primary w-100" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
                </form>
              ) : (
                <form onSubmit={handleReset}>
                  {!token ? (
                    <div className="mb-3">
                      <div className="alert alert-info">No reset token detected. Please use the reset link sent to your email. You can also request a new reset link below.</div>
                      <div className="d-flex">
                        <button type="button" className="btn btn-outline-secondary me-2" onClick={() => setMode('request')}>Request new link</button>
                        <a href="/auth" className="btn btn-link">Back to sign in</a>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <label htmlFor="newPassword" className="form-label">New Password</label>
                        <input type="password" className="form-control" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="verifyPassword" className="form-label">Verify Password</label>
                        <input type="password" className="form-control" id="verifyPassword" value={verifyPassword} onChange={(e) => setVerifyPassword(e.target.value)} required />
                      </div>
                      <button className="btn btn-primary w-100" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
                    </>
                  )}
                </form>
              )}

              <div className="text-center mt-4 small">
                <a href="/auth" className="text-decoration-none">Back to sign in</a>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
