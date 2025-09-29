'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserAction } from '../lib/actions'

export default function AuthWrapper({ children }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await getCurrentUserAction()
        if (result.success && result.user) {
          setIsAuthenticated(true)
          // Store user in localStorage for components that still need it
          localStorage.setItem('user', JSON.stringify(result.user))
        } else {
          setIsAuthenticated(false)
          // Clear any stale user data
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          router.replace('/auth')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsAuthenticated(false)
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        router.replace('/auth')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  // Only render children if authenticated
  return isAuthenticated ? children : null
}
