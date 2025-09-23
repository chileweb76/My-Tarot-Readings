"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, parseJsonSafe } from '../../../lib/api'

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
        const response = await apiFetch('/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        let data = null
        try {
          data = await parseJsonSafe(response)
        } catch (parseErr) {
          // parseJsonSafe should normally never throw, but guard just in case
          console.warn('parseJsonSafe threw an error while parsing verify response', parseErr)
          try {
            const raw = await response.text()
            data = { __rawText: raw }
          } catch (e) {
            data = null
          }
        }

        if (response.ok) {
          setStatus('success')
          // redirect to the success page (exists at /auth/success in this app)
          setTimeout(() => router.push('/auth/success'), 1200)
          return
        }

        // If non-JSON was returned (e.g., plain token string or HTML), surface
        // the raw text to the console to aid debugging.
        console.error('Verify failed', response.status, data && data.__rawText ? data.__rawText : data)
        setStatus('error')
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
