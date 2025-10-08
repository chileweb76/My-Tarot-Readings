'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// Reset page should be publicly accessible (do not use AuthWrapper which
// enforces authentication). Render in the public auth container instead.
import { notify } from '../../../lib/toast'
import { resetPasswordAction, submitNewPasswordAction } from '../../../lib/actions'
import { useSearchParams } from 'next/navigation'

export default function ResetPage() {
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const tokenFromUrl = search ? search.get('token') : null

  // Request-reset form
  const [resetState, resetFormAction, resetPending] = useActionState(async (prevState, formData) => {
    const result = await resetPasswordAction(formData)
    if (result.success) {
      notify({ type: 'success', text: result.message })
      return { success: true }
    } else {
      notify({ type: 'error', text: result.error })
      return { error: result.error }
    }
  }, { success: false, error: null })

  // Set-new-password form (token in URL)
  const router = useRouter()

  const [setState, setFormAction, setPending] = useActionState(async (prevState, formData) => {
    const result = await submitNewPasswordAction(formData)
    console.debug('submitNewPasswordAction result:', result)
    if (result.success) {
      notify({ type: 'success', text: result.message })
      // Use router.replace for immediate, reliable redirect in Next client
      try {
        router.replace('/auth')
      } catch (e) {
        // Fallback
        window.location.replace('/auth')
      }
      return { success: true }
    } else {
      notify({ type: 'error', text: result.error })
      return { error: result.error }
    }
  }, { success: false, error: null })

  return (
    <div className="auth-container">
      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow auth-card">
            <div className="card-body p-5">
              {tokenFromUrl ? (
                <form action={setFormAction} className="p-3">
                  <h3>Set new password</h3>
                  <p className="text-muted small">Enter a new password for your account.</p>
                  <input type="hidden" name="token" value={tokenFromUrl} />
                  <div className="mb-2">
                    <label className="form-label">New password</label>
                    <input className="form-control" name="newPassword" type="password" minLength={6} required />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Verify password</label>
                    <input className="form-control" name="verifyPassword" type="password" minLength={6} required />
                  </div>
                  <div>
                    <button className="btn btn-tarot-primary" type="submit" disabled={setPending}>{setPending ? 'Saving...' : 'Set password'}</button>
                  </div>
                </form>
              ) : (
                <form action={resetFormAction} className="p-3">
                  <h3>Reset password</h3>
                  <p className="text-muted small">Enter your account email and we'll send a password reset link. Check your inbox and spam folder.</p>
                  <div className="mb-2">
                    <label className="form-label">Email</label>
                    <input className="form-control" name="email" type="email" required />
                  </div>
                  <div>
                    <button className="btn btn-tarot-primary" type="submit" disabled={resetPending}>{resetPending ? 'Sending...' : 'Send reset'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
