'use client'

import { useState, useActionState } from 'react'
import AuthWrapper from '../../../components/AuthWrapper'
import { notify } from '../../../lib/toast'
import { resetPasswordAction } from '../../../lib/actions'

export default function ResetPage() {
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

  return (
    <AuthWrapper>
      <form action={resetFormAction} className="p-3">
  <h3>Reset password</h3>
  <p className="text-muted small">Enter your account email and we'll send a password reset link. Check your inbox and spam folder.</p>
        <div className="mb-2">
          <label className="form-label">Email</label>
          <input 
            className="form-control" 
            name="email"
            type="email"
            required
          />
        </div>
        <div>
          <button className="btn btn-tarot-primary" type="submit" disabled={resetPending}>
            {resetPending ? 'Sending...' : 'Send reset'}
          </button>
        </div>
      </form>
    </AuthWrapper>
  )
}
