'use client'

import { useEffect, useState } from 'react'
import AuthWrapper from '../../components/AuthWrapper'
import { apiFetch } from '../../lib/api'

export default function ReadingPage() {
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchReading = async () => {
  try {
  const response = await apiFetch('/api/readings')
        
        if (!response.ok) {
          throw new Error('Failed to fetch reading')
        }
        
        const data = await response.json()
        setReading(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reading')
      } finally {
        setLoading(false)
      }
    }

    fetchReading()
  }, [])

  return (
    <AuthWrapper />
  )
}
