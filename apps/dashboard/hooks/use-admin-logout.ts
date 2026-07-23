// hooks/use-admin-logout.ts
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function useAdminLogout() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  return { logout, isLoading }
}