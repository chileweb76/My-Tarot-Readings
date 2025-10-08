'use client'

import { useState, useActionState } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '../../lib/icons'
import { signInAction, signUpAction } from '../../lib/actions'

export default function AuthPage() {
  const [isSignIn, setIsSignIn] = useState(true)
  const [signInState, signInFormAction, signInPending] = useActionState(async (prevState, formData) => {
    const result = await signInAction(formData)
    if (result.success) {
      // Store user data in localStorage for client-side components
      localStorage.setItem('user', JSON.stringify(result.user))
      // Redirect after successful sign in
      window.location.href = '/'
      return { success: true, message: 'Sign in successful!' }
    }
    return result
  }, { success: false, error: null })

  const [signUpState, signUpFormAction, signUpPending] = useActionState(async (prevState, formData) => {
    const result = await signUpAction(formData)
    if (result.success) {
      // If registration requires email verification, do NOT log user in
      if (result.requiresVerification) {
        return { 
          success: true, 
          message: result.message || 'Registration successful! Please check your email to verify your account before logging in.',
          requiresVerification: true
        }
      }
      // Legacy path: if no verification required (shouldn't happen with new flow)
      localStorage.setItem('user', JSON.stringify(result.user))
      window.location.href = '/'
      return { success: true, message: 'Account created successfully!' }
    }
    return result
  }, { success: false, error: null })

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

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
                  onClick={() => setIsSignIn(true)}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`btn ${!isSignIn ? 'btn-tarot-primary' : 'btn-outline-tarot-primary'}`}
                  onClick={() => setIsSignIn(false)}
                >
                  Register
                </button>
              </div>

              {/* Error and Success Messages */}
              {(signInState.error || signUpState.error) && (
                <div className="alert alert-danger" role="alert">
                  {signInState.error || signUpState.error}
                </div>
              )}
              {(signInState.success || signUpState.success) && (
                <div className={`alert ${signUpState.requiresVerification ? 'alert-info' : 'alert-success'}`} role="alert" style={signUpState.requiresVerification ? { color: '#004085', backgroundColor: '#d1ecf1', borderColor: '#bee5eb' } : {}}>
                  <strong>{signUpState.requiresVerification ? '📧 Verification Required' : 'Success!'}</strong>
                  <div className="mt-2">{signInState.message || signUpState.message}</div>
                  {signUpState.requiresVerification && (
                    <div className="mt-2 small" style={{ color: '#004085' }}>
                      Please check your email inbox (and spam folder) for a verification link. You must verify your email before you can log in.
                    </div>
                  )}
                </div>
              )}

            {/* Sign In Form */}
            {isSignIn ? (
              <div>
                <form action={signInFormAction}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
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
                      required
                    />
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <button type="submit" className="btn btn-tarot-primary w-100 me-2" disabled={signInPending}>
                      {signInPending ? (
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
                    onClick={() => window.location.href = `${API_BASE}/api/auth/google`}
                    disabled={signInPending}
                  >
                    <FontAwesomeIcon icon={faGoogle} className="me-2" />
                    {signInPending ? 'Redirecting...' : 'Sign in with Google'}
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
                <form action={signUpFormAction}>
                  <div className="mb-3">
                    <label htmlFor="registerEmail" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="registerEmail"
                      name="email"
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
                      minLength="6"
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
                      minLength="6"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-tarot-primary w-100 mb-4" disabled={signUpPending}>
                    {signUpPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
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