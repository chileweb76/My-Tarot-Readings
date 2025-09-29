"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthWrapper from '../../../components/AuthWrapper'
import { parseJsonSafe } from '../../../lib/api'
import { verifyAuthTokenAction } from '../../../lib/actions'

export default function VerifyPage() {
  const [status, setStatus] = useState('pending') // pending | success | error
  const router = useRouter()

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search)
    const token = qs.get('token')
    if (!token) {
      setStatus('error')
      return
    }

    async function doVerify() {
      try {
        const result = await verifyAuthTokenAction(token)

        if (!result.success) {
          throw new Error(result.error || 'Verification failed')
        }

        setStatus('success')
        // redirect to the success page (exists at /auth/success in this app)
        setTimeout(() => router.push('/auth/success'), 1200)
        return
      } catch (err) {
        console.error('Network or server error during verification', err)
        setStatus('error')
      }
    }

    doVerify()
  }, [router])

  if (status === 'pending') return <div className="p-4">Verifying your email…</div>
  if (status === 'success') return <div className="p-4">Your email was verified — redirecting…</div>
  return <div className="p-4">Failed to verify your email. Try resending the verification email or contact support.</div>
}
