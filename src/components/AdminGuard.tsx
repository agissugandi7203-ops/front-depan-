import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuthModalStore } from '@/store/authModalStore'

interface AdminGuardProps {
  children: React.ReactNode
}

/**
 * Guard komponen untuk melindung rute administrasi internal (/admin)
 * Memverifikasi sesi aktif dan memastikan user memiliki peran admin/petugas/superadmin
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, user, checkMe, isLoading } = useAuthStore()
  const [checking, setChecking] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const verifySession = async () => {
      try {
        if (isAuthenticated && !user) {
          await checkMe()
        }
      } catch (err) {
        console.error('Failed to verify session in AdminGuard:', err)
      } finally {
        setChecking(false)
      }
    }

    verifySession()
  }, [isAuthenticated, user, checkMe])

  if (isLoading || checking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080808] text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
          <p className="text-xs text-zinc-500 tracking-wider">Memvalidasi hak akses admin...</p>
        </div>
      </div>
    )
  }

  // Jika belum login: buka AuthModal dan redirect ke /
  if (!isAuthenticated) {
    useAuthModalStore.getState().openModal('login')
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Jika login tetapi perannya adalah user (warga biasa), tidak diizinkan masuk ke panel admin
  if (user && user.role === 'user') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
