"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('jwt')
    if (!token) {
      router.push('/login')
      setIsAuthenticated(false)
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
