import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/services/auth'

type Status = 'loading' | 'success' | 'error'

export function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('Memverifikasi email Anda...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase v2: token bisa ada di hash (#) atau query string (?)
        // Combine both query and hash parameters to prevent missing parameters in redirect loops
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const queryParams = new URLSearchParams(window.location.search)
        const params = new URLSearchParams()
        for (const [key, value] of hashParams.entries()) {
          params.set(key, value)
        }
        for (const [key, value] of queryParams.entries()) {
          params.set(key, value)
        }

        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const tokenHash = params.get('token_hash')
        const type = params.get('type')

        // Helper to clear session locally without making server network requests
        const clearLocalSession = () => {
          // Clear Supabase's client localStorage token keys
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key)
            }
          }
          // Clear custom tokens
          localStorage.removeItem('komunitas_access_token')
          localStorage.removeItem('komunitas_refresh_token')
        }

        // ── Flow 1: PKCE / token_hash (Supabase v2 newer email confirmation) ──
        if (tokenHash && type === 'email') {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email',
          })

          if (error) {
            setStatus('error')
            setMessage('Link konfirmasi tidak valid atau sudah kedaluwarsa. Silakan daftar ulang.')
            return
          }

          clearLocalSession()
          setStatus('success')
          setMessage('Email berhasil dikonfirmasi! Mengalihkan ke halaman masuk...')
          setTimeout(() => {
            window.location.href = '/login'
          }, 2500)
          return
        }

        // ── Flow 2: Implicit access_token in hash (Google OAuth or email confirmation) ──
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            setStatus('error')
            setMessage('Sesi tidak valid. Silakan coba masuk kembali.')
            return
          }

          // If 'type' is present, this is an email confirmation flow (signup/recovery)
          // If 'type' is NOT present, this is a Google OAuth login flow
          if (!type) {
            localStorage.setItem('komunitas_access_token', accessToken)
            localStorage.setItem('komunitas_refresh_token', refreshToken)
            setStatus('success')
            setMessage('Berhasil masuk! Mengalihkan ke beranda...')
            setTimeout(() => {
              window.location.href = '/'
            }, 1800)
            return
          }

          // Otherwise it's an email confirmation flow
          clearLocalSession()
          setStatus('success')
          setMessage('Email berhasil dikonfirmasi! Mengalihkan ke halaman masuk...')
          setTimeout(() => {
            window.location.href = '/login'
          }, 2500)
          return
        }

        // ── Flow 3: Supabase redirects with onAuthStateChange fallback ──
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // If 'type' is NOT present, it's an OAuth login flow
          if (!type) {
            localStorage.setItem('komunitas_access_token', session.access_token)
            localStorage.setItem('komunitas_refresh_token', session.refresh_token)
            setStatus('success')
            setMessage('Berhasil masuk! Mengalihkan ke beranda...')
            setTimeout(() => {
              window.location.href = '/'
            }, 1800)
            return
          } else {
            clearLocalSession()
            setStatus('success')
            setMessage('Email berhasil dikonfirmasi! Mengalihkan ke halaman masuk...')
            setTimeout(() => {
              window.location.href = '/login'
            }, 2500)
            return
          }
        }

        // No valid params found — might be a direct URL access or already confirmed
        setStatus('error')
        setMessage('Tidak ada token konfirmasi yang ditemukan. Silakan coba klik ulang link di email Anda.')

      } catch (err) {
        console.error('[AuthCallback] Error:', err)
        setStatus('error')
        setMessage('Terjadi kesalahan tidak terduga. Silakan coba lagi atau hubungi administrator.')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      {/* Background ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-700 ${
            status === 'success'
              ? 'bg-emerald-950/30'
              : status === 'error'
              ? 'bg-red-950/20'
              : 'bg-zinc-800/10'
          }`}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-sm text-center"
      >
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl shadow-2xl px-8 py-10 space-y-5">

          {/* Icon */}
          <motion.div
            key={status}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'backOut' }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border"
            style={{
              borderColor: status === 'success'
                ? 'rgba(52,211,153,0.2)'
                : status === 'error'
                ? 'rgba(239,68,68,0.2)'
                : 'rgba(82,82,91,0.4)',
              background: status === 'success'
                ? 'rgba(6,78,59,0.2)'
                : status === 'error'
                ? 'rgba(69,10,10,0.2)'
                : 'rgba(39,39,42,0.3)',
            }}
          >
            {status === 'loading' && <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-8 w-8 text-emerald-400" />}
            {status === 'error' && <XCircle className="h-8 w-8 text-red-400" />}
          </motion.div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-sm font-bold text-zinc-100 tracking-tight">
              {status === 'loading' && 'Memverifikasi Email'}
              {status === 'success' && 'Email Terverifikasi!'}
              {status === 'error' && 'Verifikasi Gagal'}
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>
          </div>

          {/* Progress bar for redirect countdown */}
          {status === 'success' && (
            <motion.div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: 'linear' }}
              />
            </motion.div>
          )}

          {/* Error actions */}
          {status === 'error' && (
            <div className="space-y-2">
              <button
                onClick={() => navigate('/register', { replace: true })}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 text-xs font-bold text-zinc-950 hover:bg-white transition-all"
              >
                Daftar Ulang
              </button>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all"
              >
                Kembali ke Halaman Masuk
              </button>
            </div>
          )}

          {/* Logo */}
          <div className="pt-2 flex items-center justify-center gap-2 opacity-40">
            <div className="h-5 w-5 overflow-hidden rounded">
              <img src="/assets/logo/komunitas.png" alt="KOMUNITAS" className="h-full w-full object-contain" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">KOMUNITAS</span>
          </div>

        </div>
      </motion.div>
    </div>
  )
}
