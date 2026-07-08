import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuthModalStore } from '@/store/authModalStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('user' | 'petugas' | 'admin' | 'superadmin')[]
}

/**
 * Wrapper rute terproteksi untuk membatasi akses halaman
 * Hanya dapat diakses jika user sudah login (memiliki sesi aktif)
 * Dan perannya (role) diizinkan jika allowedRoles disediakan
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, checkMe, isLoading } = useAuthStore()
  const { openModal } = useAuthModalStore()
  const [checking, setChecking] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const verifySession = async () => {
      try {
        if (isAuthenticated && !user) {
          await checkMe()
        }
      } catch (err) {
        console.error('Failed to verify session in ProtectedRoute:', err)
      } finally {
        setChecking(false)
      }
    }

    verifySession()
  }, [isAuthenticated, user, checkMe])

  // Menampilkan spinner saat loading data sesi
  if (isLoading || checking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080808] text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
          <p className="text-xs text-zinc-500 tracking-wider">Memvalidasi izin sesi...</p>
        </div>
      </div>
    )
  }

  // Jika tidak memiliki token/tidak login: buka AuthModal dan redirect ke /
  if (!isAuthenticated) {
    // Panggil via store state agar modal terbuka di landing page
    useAuthModalStore.getState().openModal('login')
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Jika login namun perannya tidak termasuk dalam allowedRoles
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-[#080808] text-zinc-100 p-6 select-none">
        <div className="max-w-md w-full rounded-2xl border border-zinc-900 bg-zinc-900/40 p-8 text-center space-y-6 backdrop-blur-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-950/40 border border-red-900/30 text-red-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-md font-bold uppercase tracking-wider text-zinc-100">Akses Ditolak</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Akun Anda ({user.nama_lengkap}) terdaftar dengan peran <span className="font-mono text-indigo-400 font-bold">[{user.role.toUpperCase()}]</span>. 
              Peran Anda tidak memiliki otoritas untuk mengakses halaman ini.
            </p>
          </div>
          <div className="pt-2">
            <a 
              href="/" 
              className="inline-block px-5 py-2 text-xs font-semibold rounded-lg bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
