'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '../../lib/icons'
import { apiFetch, parseJsonSafe } from '../../lib/api'

export default function AuthPage() {
  const [isSignIn, setIsSignIn] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    verifyPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear errors when user starts typing
    if (error) setError('')
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      })

      const data = await parseJsonSafe(response)
      if (!response.ok) {
        // If the response isn't JSON, surface the HTTP status and any text body
        const raw = data?.__rawText
        const message = data?.error || data?.message || raw || `Login failed (${response.status})`
        throw new Error(message)
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      setSuccess('Login successful! Redirecting...')
      setTimeout(() => { window.location.href = '/' }, 1500)
    } catch (error) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Client-side validation
    if (formData.password !== formData.verifyPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, email: formData.email, password: formData.password, verifyPassword: formData.verifyPassword })
      })
      const data = await parseJsonSafe(response)
      if (!response.ok) {
        const message = data?.error || data?.message || `Registration failed (${response.status})`
        throw new Error(message)
      }
      setSuccess('Registration successful! Please check your email and verify your account before logging in.')
      setFormData((prev) => ({ ...prev, email: data.user.email }))
    } catch (error) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await apiFetch('/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      })
      const data = await parseJsonSafe(response)
      if (!response.ok) {
        const message = data?.error || data?.message || `Failed to resend (${response.status})`
        throw new Error(message)
      }
      setSuccess('Verification email resent. Please check your inbox.')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    // Redirect to Google OAuth
    window.location.href = `${API_URL}/auth/google`
  }

  return (
    <div className="auth-container">
      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow auth-card">
            <div className="card-body p-5">
              {/* Logo */}
              <div className="text-center mb-4">
                <Image 
                  src="/images/logo.png" 
                  alt="My Tarot Readings Logo" 
                  width={400}
                  height={200}
                  priority
                  className="site-logo"
                  style={{ height: 'auto', objectFit: 'contain' }}
                />
              </div>

              {/* Toggle Buttons */}
              <div className="btn-group w-100 mb-4" role="group">
                <button
                  type="button"
                  className={`btn ${isSignIn ? 'btn-tarot-primary' : 'btn-outline-tarot-primary'}`}
                  onClick={() => {
                    setIsSignIn(true)
                    setError('')
                    setSuccess('')
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`btn ${!isSignIn ? 'btn-tarot-primary' : 'btn-outline-tarot-primary'}`}
                  onClick={() => {
                    setIsSignIn(false)
                    setError('')
                    setSuccess('')
                  }}
                >
                  Register
                </button>
              </div>

              {/* Error and Success Messages */}
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              {success && (
                <div className="alert alert-success" role="alert">
                  {success}
                </div>
              )}            {/* Sign In Form */}
            {isSignIn ? (
              <div>
                <form onSubmit={handleSignIn}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <button type="submit" className="btn btn-tarot-primary w-100 me-2" disabled={isLoading}>
                                          {isLoading ? (
                                            <>
                                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                              Signing In...
                                            </>
                                          ) : (
                                            'Sign In'
                                          )}
                                        </button>
                                        <a href="/auth/reset" className="small text-decoration-none forgot-password-link">Forgot password?</a>
                                      </div>
                    
                </form>

                {/* Google Sign In */}
                <div className="text-center mb-3">
                  <span className="text-muted">or</span>
                </div>
                                  <button
                    type="button"
                    className="btn btn-outline-danger w-100 mb-4"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <FontAwesomeIcon icon={faGoogle} className="me-2" />
                    {isLoading ? 'Redirecting...' : 'Sign in with Google'}
                  </button>

                  {/* App Description */}
                  <div className="text-center">
                    <div className="border-top pt-4">
                      <p className="text-muted small mb-0">
                        Welcome to your tarot journal where you can document your tarot journey. Whether they are personal readings for yourself or readings for others, you can keep track of each spread used, the cards drawn, the interpretation of each card, as well as an overall interpretation and the image of your reading. Update later with the overall outcome. Insights included, plus the ability to share and print each reading.
                      </p>
                    </div>
                  </div>
              </div>
            ) : (
              /* Register Form */
              <div>
                <h3 className="text-center mb-4">Create Account</h3>
                <form onSubmit={handleRegister}>
                  <div className="mb-3">
                    <label htmlFor="registerEmail" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="registerEmail"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="registerPassword" className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="registerPassword"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="verifyPassword" className="form-label">Verify Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="verifyPassword"
                      name="verifyPassword"
                      value={formData.verifyPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-tarot-primary w-100 mb-4" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                  {/* Resend verification button shown after registration */}
                  {success.includes('verify') && (
                    <div className="text-center">
                      <button
                        type="button"
                        className="btn btn-outline-tarot-primary w-100"
                        onClick={handleResend}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Sending...' : 'Resend verification email'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

          </div>
        </div>
        </div>
      </div>
    </div>
  )
}